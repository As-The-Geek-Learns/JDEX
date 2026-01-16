/**
 * Watcher Service - File System Monitoring for Auto-Organization
 * ==============================================================
 * 
 * Monitors configured folders for new files and either:
 * - Auto-organizes them based on matching rules (if enabled)
 * - Queues them for user review
 * 
 * This service only works in the Electron desktop app since it requires
 * file system access.
 * 
 * @module services/watcherService
 */

import {
  getWatchedFolders,
  getWatchedFolder,
  updateWatchedFolder,
  logWatchActivity,
  incrementWatchedFolderStats,
} from '../db.js';
import { getMatchingEngine, CONFIDENCE } from './matchingEngine.js';
import { moveFile, buildDestinationPath, hasFileSystemAccess } from './fileOperations.js';
import { FileSystemError } from '../utils/errors.js';
import { validateFilePath } from '../utils/validation.js';

// File type detection based on extension
const FILE_TYPE_MAP = {
  // Documents
  pdf: 'document', doc: 'document', docx: 'document', txt: 'document', 
  md: 'document', rtf: 'document', odt: 'document',
  // Spreadsheets  
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'data', numbers: 'spreadsheet',
  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  svg: 'image', heic: 'image', raw: 'image', tiff: 'image',
  // Code
  js: 'code', ts: 'code', py: 'code', java: 'code', html: 'code', 
  css: 'code', jsx: 'code', tsx: 'code', json: 'code',
  // Archives
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  // Audio
  mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', m4a: 'audio',
  // Video
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
};

/**
 * Get file type from extension.
 */
function getFileType(extension) {
  return FILE_TYPE_MAP[extension?.toLowerCase()] || 'other';
}

// =============================================================================
// Module State
// =============================================================================

const activeWatchers = new Map(); // folderId -> watcher instance
const pendingFiles = new Map(); // filePath -> { timeout, folderId, stats }
let isElectron = false;
let fs = null;
let path = null;

// Configuration
const DEBOUNCE_MS = 2000; // Wait 2 seconds after file stops changing
const POLL_INTERVAL_MS = 5000; // Fallback polling interval

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the watcher service.
 * Loads fs and path modules if running in Electron.
 * 
 * @returns {boolean} True if running in Electron with file access
 */
export function initWatcherService() {
  try {
    // Check if we're in Electron
    if (typeof window !== 'undefined' && window.process?.type === 'renderer') {
      // Running in Electron renderer
      const { ipcRenderer } = window.require('electron');
      fs = window.require('fs');
      path = window.require('path');
      isElectron = true;
      console.log('[WatcherService] Initialized in Electron environment');
      return true;
    }
    
    // Try Node.js environment (for testing)
    if (typeof process !== 'undefined' && process.versions?.node) {
      fs = require('fs');
      path = require('path');
      isElectron = true;
      console.log('[WatcherService] Initialized in Node.js environment');
      return true;
    }
    
    console.log('[WatcherService] Browser environment - file watching disabled');
    return false;
  } catch (error) {
    console.log('[WatcherService] Not in Electron environment:', error.message);
    return false;
  }
}

/**
 * Check if the watcher service is available.
 * 
 * @returns {boolean} True if file watching is available
 */
export function isWatcherAvailable() {
  return isElectron && fs !== null;
}

// =============================================================================
// Core Watcher Functions
// =============================================================================

/**
 * Start watching all active folders.
 * Called when the app starts.
 */
export function startAllWatchers() {
  if (!isWatcherAvailable()) {
    console.log('[WatcherService] Watchers not available (browser mode)');
    return;
  }
  
  const folders = getWatchedFolders({ activeOnly: true });
  console.log(`[WatcherService] Starting ${folders.length} watchers...`);
  
  for (const folder of folders) {
    startWatcher(folder.id);
  }
}

/**
 * Stop all active watchers.
 * Called when the app closes.
 */
export function stopAllWatchers() {
  console.log(`[WatcherService] Stopping ${activeWatchers.size} watchers...`);
  
  for (const [folderId] of activeWatchers) {
    stopWatcher(folderId);
  }
  
  // Clear any pending file operations
  for (const [, pending] of pendingFiles) {
    clearTimeout(pending.timeout);
  }
  pendingFiles.clear();
}

/**
 * Start watching a specific folder.
 * 
 * @param {number} folderId - The watched folder ID
 * @returns {boolean} True if watcher started successfully
 */
export function startWatcher(folderId) {
  if (!isWatcherAvailable()) {
    console.log('[WatcherService] Cannot start watcher - not in Electron');
    return false;
  }
  
  // Stop existing watcher if any
  if (activeWatchers.has(folderId)) {
    stopWatcher(folderId);
  }
  
  const folder = getWatchedFolder(folderId);
  if (!folder) {
    console.error(`[WatcherService] Folder ${folderId} not found`);
    return false;
  }
  
  if (!folder.is_active) {
    console.log(`[WatcherService] Folder ${folder.name} is not active`);
    return false;
  }
  
  // Validate path exists
  if (!fs.existsSync(folder.path)) {
    console.error(`[WatcherService] Path does not exist: ${folder.path}`);
    return false;
  }
  
  try {
    // Create the watcher
    const watcher = fs.watch(
      folder.path,
      { recursive: folder.include_subdirs === 1 },
      (eventType, filename) => {
        if (eventType === 'rename' && filename) {
          handleFileEvent(folderId, folder.path, filename);
        }
      }
    );
    
    watcher.on('error', (error) => {
      console.error(`[WatcherService] Watcher error for ${folder.name}:`, error);
      // Try to restart the watcher
      setTimeout(() => startWatcher(folderId), 5000);
    });
    
    activeWatchers.set(folderId, watcher);
    console.log(`[WatcherService] Started watching: ${folder.name} (${folder.path})`);
    
    return true;
  } catch (error) {
    console.error(`[WatcherService] Failed to start watcher for ${folder.name}:`, error);
    return false;
  }
}

/**
 * Stop watching a specific folder.
 * 
 * @param {number} folderId - The watched folder ID
 */
export function stopWatcher(folderId) {
  const watcher = activeWatchers.get(folderId);
  if (watcher) {
    watcher.close();
    activeWatchers.delete(folderId);
    console.log(`[WatcherService] Stopped watcher for folder ${folderId}`);
  }
}

/**
 * Get the status of all watchers.
 * 
 * @returns {Array} Array of watcher status objects
 */
export function getWatcherStatus() {
  const folders = getWatchedFolders();
  
  return folders.map(folder => ({
    ...folder,
    is_running: activeWatchers.has(folder.id),
    can_run: isWatcherAvailable() && fs?.existsSync(folder.path),
  }));
}

// =============================================================================
// File Event Handling
// =============================================================================

/**
 * Handle a file system event.
 * Uses debouncing to wait for files to finish writing.
 * 
 * @param {number} folderId - The watched folder ID
 * @param {string} folderPath - The watched folder path
 * @param {string} filename - The detected filename
 */
function handleFileEvent(folderId, folderPath, filename) {
  const fullPath = path.join(folderPath, filename);
  
  // Skip hidden files and system files
  if (filename.startsWith('.') || filename.startsWith('~')) {
    return;
  }
  
  // Skip directories
  try {
    if (!fs.existsSync(fullPath)) {
      // File was deleted, clear any pending operations
      if (pendingFiles.has(fullPath)) {
        clearTimeout(pendingFiles.get(fullPath).timeout);
        pendingFiles.delete(fullPath);
      }
      return;
    }
    
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return;
    }
    
    // Clear existing debounce timer
    if (pendingFiles.has(fullPath)) {
      clearTimeout(pendingFiles.get(fullPath).timeout);
    }
    
    // Set new debounce timer
    const timeout = setTimeout(() => {
      processFile(folderId, fullPath, filename);
      pendingFiles.delete(fullPath);
    }, DEBOUNCE_MS);
    
    pendingFiles.set(fullPath, {
      timeout,
      folderId,
      stats,
    });
    
  } catch (error) {
    console.error(`[WatcherService] Error handling file event:`, error);
  }
}

/**
 * Process a detected file through the matching engine.
 * 
 * @param {number} folderId - The watched folder ID
 * @param {string} fullPath - Full path to the file
 * @param {string} filename - The filename
 */
async function processFile(folderId, fullPath, filename) {
  const folder = getWatchedFolder(folderId);
  if (!folder) return;
  
  console.log(`[WatcherService] Processing file: ${filename}`);
  
  try {
    // Get file stats
    const stats = fs.statSync(fullPath);
    const extension = path.extname(filename).toLowerCase().slice(1);
    const fileType = getFileType(extension);
    
    // Check if file type filter applies
    if (folder.file_types && folder.file_types.length > 0) {
      if (!folder.file_types.includes(fileType) && !folder.file_types.includes(extension)) {
        console.log(`[WatcherService] File type ${fileType} not in filter, skipping`);
        logWatchActivity({
          watched_folder_id: folderId,
          filename,
          path: fullPath,
          file_extension: extension,
          file_type: fileType,
          file_size: stats.size,
          action: 'skipped',
        });
        return;
      }
    }
    
    // Log detection
    logWatchActivity({
      watched_folder_id: folderId,
      filename,
      path: fullPath,
      file_extension: extension,
      file_type: fileType,
      file_size: stats.size,
      action: 'detected',
    });
    
    // Find matching rule using the matching engine
    const engine = getMatchingEngine();
    const suggestions = engine.matchFile({
      filename,
      path: fullPath,
      file_extension: extension,
      file_type: fileType,
    });
    
    // Get best match (first suggestion, if any)
    const match = suggestions.length > 0 ? suggestions[0] : null;
    
    if (!match || !match.targetFolder) {
      console.log(`[WatcherService] No matching rule for: ${filename}`);
      logWatchActivity({
        watched_folder_id: folderId,
        filename,
        path: fullPath,
        file_extension: extension,
        file_type: fileType,
        file_size: stats.size,
        action: 'queued',
      });
      incrementWatchedFolderStats(folderId, false);
      
      // Emit event for UI notification
      emitWatchEvent('file_queued', { folderId, filename, path: fullPath });
      return;
    }
    
    // Check confidence threshold
    // Convert confidence level to comparable value
    const confidenceToNumber = (conf) => {
      if (conf === CONFIDENCE.HIGH || conf === 'high') return 3;
      if (conf === CONFIDENCE.MEDIUM || conf === 'medium') return 2;
      if (conf === CONFIDENCE.LOW || conf === 'low') return 1;
      return 0;
    };
    
    const matchConfidence = confidenceToNumber(match.confidence);
    const thresholdConfidence = confidenceToNumber(folder.confidence_threshold);
    
    if (matchConfidence < thresholdConfidence) {
      console.log(`[WatcherService] Match confidence ${match.confidence} below threshold ${folder.confidence_threshold}`);
      logWatchActivity({
        watched_folder_id: folderId,
        filename,
        path: fullPath,
        file_extension: extension,
        file_type: fileType,
        file_size: stats.size,
        action: 'queued',
        matched_rule_id: match.ruleId || null,
        target_folder: match.targetFolder,
      });
      incrementWatchedFolderStats(folderId, false);
      
      emitWatchEvent('file_queued', { folderId, filename, path: fullPath, suggestion: match });
      return;
    }
    
    // Auto-organize if enabled
    if (folder.auto_organize) {
      try {
        // Build destination path and move the file
        const destPath = buildDestinationPath(match.targetFolder, filename);
        const result = moveFile({
          sourcePath: fullPath,
          destPath: destPath,
          folderNumber: match.targetFolder,
        });
        
        if (result.success) {
          logWatchActivity({
            watched_folder_id: folderId,
            filename,
            path: fullPath,
            file_extension: extension,
            file_type: fileType,
            file_size: stats.size,
            action: 'auto_organized',
            matched_rule_id: match.ruleId || null,
            target_folder: match.targetFolder,
          });
          incrementWatchedFolderStats(folderId, true);
          
          console.log(`[WatcherService] Auto-organized: ${filename} → ${match.targetFolder}`);
          
          // Emit notification if enabled
          if (folder.notify_on_organize) {
            emitWatchEvent('file_organized', {
              folderId,
              filename,
              targetFolder: match.targetFolder,
              ruleName: match.ruleName || 'Auto-match',
            });
          }
        } else {
          throw new Error(result.error || 'Move failed');
        }
      } catch (error) {
        console.error(`[WatcherService] Auto-organize failed:`, error);
        logWatchActivity({
          watched_folder_id: folderId,
          filename,
          path: fullPath,
          file_extension: extension,
          file_type: fileType,
          file_size: stats.size,
          action: 'error',
          matched_rule_id: match.ruleId || null,
          target_folder: match.targetFolder,
          error_message: error.message,
        });
        
        emitWatchEvent('file_error', { folderId, filename, error: error.message });
      }
    } else {
      // Queue for manual review
      logWatchActivity({
        watched_folder_id: folderId,
        filename,
        path: fullPath,
        file_extension: extension,
        file_type: fileType,
        file_size: stats.size,
        action: 'queued',
        matched_rule_id: match.ruleId || null,
        target_folder: match.targetFolder,
      });
      incrementWatchedFolderStats(folderId, false);
      
      console.log(`[WatcherService] Queued for review: ${filename} (suggested: ${match.targetFolder})`);
      
      emitWatchEvent('file_queued', { folderId, filename, path: fullPath, suggestion: match });
    }
    
  } catch (error) {
    console.error(`[WatcherService] Error processing file ${filename}:`, error);
    logWatchActivity({
      watched_folder_id: folderId,
      filename,
      path: fullPath,
      action: 'error',
      error_message: error.message,
    });
  }
}

// =============================================================================
// Event Emission (for UI Updates)
// =============================================================================

const eventListeners = new Map();

/**
 * Subscribe to watch events.
 * 
 * @param {string} eventType - The event type
 * @param {Function} callback - The callback function
 * @returns {Function} Unsubscribe function
 */
export function onWatchEvent(eventType, callback) {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, new Set());
  }
  eventListeners.get(eventType).add(callback);
  
  return () => {
    eventListeners.get(eventType).delete(callback);
  };
}

/**
 * Emit a watch event to all subscribers.
 * 
 * @param {string} eventType - The event type
 * @param {Object} data - The event data
 */
function emitWatchEvent(eventType, data) {
  const listeners = eventListeners.get(eventType);
  if (listeners) {
    for (const callback of listeners) {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WatcherService] Event listener error:`, error);
      }
    }
  }
}

// =============================================================================
// Manual Operations
// =============================================================================

/**
 * Manually process all files in a watched folder.
 * Useful for initial setup or catching up after being offline.
 * 
 * @param {number} folderId - The watched folder ID
 * @returns {Object} Results of the processing
 */
export async function processExistingFiles(folderId) {
  if (!isWatcherAvailable()) {
    return { success: false, error: 'Watcher not available' };
  }
  
  const folder = getWatchedFolder(folderId);
  if (!folder) {
    return { success: false, error: 'Folder not found' };
  }
  
  if (!fs.existsSync(folder.path)) {
    return { success: false, error: 'Folder path does not exist' };
  }
  
  const results = {
    processed: 0,
    organized: 0,
    queued: 0,
    skipped: 0,
    errors: 0,
  };
  
  try {
    const files = fs.readdirSync(folder.path);
    
    for (const filename of files) {
      // Skip hidden files
      if (filename.startsWith('.')) {
        results.skipped++;
        continue;
      }
      
      const fullPath = path.join(folder.path, filename);
      
      // Skip directories
      if (fs.statSync(fullPath).isDirectory()) {
        results.skipped++;
        continue;
      }
      
      await processFile(folderId, fullPath, filename);
      results.processed++;
    }
    
    // Update folder stats
    updateWatchedFolder(folderId, { last_checked_at: new Date().toISOString() });
    
    return { success: true, results };
  } catch (error) {
    console.error(`[WatcherService] Error processing existing files:`, error);
    return { success: false, error: error.message, results };
  }
}

// =============================================================================
// Export Default Service Object
// =============================================================================

export default {
  initWatcherService,
  isWatcherAvailable,
  startAllWatchers,
  stopAllWatchers,
  startWatcher,
  stopWatcher,
  getWatcherStatus,
  onWatchEvent,
  processExistingFiles,
};
