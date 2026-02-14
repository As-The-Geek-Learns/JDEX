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
import { getMatchingEngine, CONFIDENCE, FileSuggestion } from './matchingEngine.js';
import { moveFile } from './fileOperations.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Node.js fs module interface for Electron.
 */
interface FsModule {
  existsSync(path: string): boolean;
  statSync(path: string): FsStats;
  readdirSync(path: string): string[];
  watch(
    path: string,
    options: { recursive: boolean },
    callback: (eventType: string, filename: string | null) => void
  ): FsWatcher;
}

/**
 * File stats from fs.statSync.
 */
interface FsStats {
  size: number;
  isDirectory(): boolean;
}

/**
 * File system watcher instance.
 */
interface FsWatcher {
  close(): void;
  on(event: 'error', callback: (error: Error) => void): void;
}

/**
 * Node.js path module interface.
 */
interface PathModule {
  join(...paths: string[]): string;
  extname(path: string): string;
}

/**
 * File types mapped from extensions.
 */
type FileType =
  | 'document'
  | 'spreadsheet'
  | 'data'
  | 'image'
  | 'code'
  | 'archive'
  | 'audio'
  | 'video'
  | 'other';

/**
 * Watched folder from database.
 */
interface WatchedFolder {
  id: number;
  name: string;
  path: string;
  is_active: number;
  include_subdirs: number;
  file_types?: string[];
  auto_organize: boolean;
  confidence_threshold: string;
  notify_on_organize: boolean;
  last_checked_at?: string;
}

/**
 * Pending file entry (for debouncing).
 */
interface PendingFile {
  timeout: ReturnType<typeof setTimeout>;
  folderId: number;
  stats: FsStats;
}

/**
 * Match suggestion from matching engine.
 */
interface MatchResult {
  confidence: string;
  targetFolder?: string;
  ruleId?: number;
  ruleName?: string;
  folder?: {
    folder_number: string;
    name: string;
  };
  rule?: {
    id: number;
    name: string;
  } | null;
}

/**
 * Watch event types.
 */
export type WatchEventType = 'file_queued' | 'file_organized' | 'file_error';

/**
 * Event data for file_queued.
 */
export interface FileQueuedEvent {
  folderId: number;
  filename: string;
  path: string;
  suggestion?: MatchResult;
}

/**
 * Event data for file_organized.
 */
export interface FileOrganizedEvent {
  folderId: number;
  filename: string;
  targetFolder: string;
  ruleName: string;
}

/**
 * Event data for file_error.
 */
export interface FileErrorEvent {
  folderId: number;
  filename: string;
  error: string;
}

/**
 * Union type for all event data.
 */
export type WatchEventData = FileQueuedEvent | FileOrganizedEvent | FileErrorEvent;

/**
 * Event callback function.
 */
export type WatchEventCallback = (data: WatchEventData) => void;

/**
 * Watcher status for a folder.
 */
export interface WatcherStatus extends WatchedFolder {
  is_running: boolean;
  can_run: boolean;
}

/**
 * Results from processing existing files.
 */
export interface ProcessingResults {
  processed: number;
  organized: number;
  queued: number;
  skipped: number;
  errors: number;
}

/**
 * Result of processExistingFiles.
 */
export interface ProcessExistingResult {
  success: boolean;
  error?: string;
  results?: ProcessingResults;
}

/**
 * Activity log parameters.
 */
interface ActivityLogParams {
  watched_folder_id: number;
  filename: string;
  path: string;
  file_extension?: string;
  file_type?: string;
  file_size?: number;
  action: string;
  matched_rule_id?: number;
  target_folder?: string;
  error_message?: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * File type detection based on extension.
 */
const FILE_TYPE_MAP: Record<string, FileType> = {
  // Documents
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  md: 'document',
  rtf: 'document',
  odt: 'document',
  // Spreadsheets
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  csv: 'data',
  numbers: 'spreadsheet',
  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  heic: 'image',
  raw: 'image',
  tiff: 'image',
  // Code
  js: 'code',
  ts: 'code',
  py: 'code',
  java: 'code',
  html: 'code',
  css: 'code',
  jsx: 'code',
  tsx: 'code',
  json: 'code',
  // Archives
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  // Audio
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  m4a: 'audio',
  // Video
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
};

/**
 * Debounce delay in milliseconds.
 */
const DEBOUNCE_MS = 2000;

// ============================================
// MODULE STATE
// ============================================

const activeWatchers = new Map<number, FsWatcher>();
const pendingFiles = new Map<string, PendingFile>();
let isElectron = false;
let fs: FsModule | null = null;
let path: PathModule | null = null;

// ============================================
// EVENT LISTENERS
// ============================================

const eventListeners = new Map<WatchEventType, Set<WatchEventCallback>>();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get file type from extension.
 */
function getFileType(extension: string | undefined): FileType {
  return FILE_TYPE_MAP[extension?.toLowerCase() ?? ''] || 'other';
}

/**
 * Convert confidence level to numeric value for comparison.
 */
function confidenceToNumber(conf: string | undefined): number {
  if (conf === CONFIDENCE.HIGH || conf === 'high') return 3;
  if (conf === CONFIDENCE.MEDIUM || conf === 'medium') return 2;
  if (conf === CONFIDENCE.LOW || conf === 'low') return 1;
  return 0;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the watcher service.
 * Loads fs and path modules if running in Electron.
 */
export function initWatcherService(): boolean {
  try {
    const windowWithProcess = window as Window & {
      process?: { type?: string };
      require?: NodeRequire;
    };

    // Check if we're in Electron
    if (typeof window !== 'undefined' && windowWithProcess.process?.type === 'renderer') {
      // Running in Electron renderer
      fs = windowWithProcess.require?.('fs') as FsModule;
      path = windowWithProcess.require?.('path') as PathModule;
      isElectron = true;
      console.log('[WatcherService] Initialized in Electron environment');
      return true;
    }

    // Try Node.js environment (for testing)
    if (typeof process !== 'undefined' && (process as NodeJS.Process).versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fs = require('fs') as FsModule;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      path = require('path') as PathModule;
      isElectron = true;
      console.log('[WatcherService] Initialized in Node.js environment');
      return true;
    }

    console.log('[WatcherService] Browser environment - file watching disabled');
    return false;
  } catch (error) {
    console.log('[WatcherService] Not in Electron environment:', (error as Error).message);
    return false;
  }
}

/**
 * Check if the watcher service is available.
 */
export function isWatcherAvailable(): boolean {
  return isElectron && fs !== null;
}

// ============================================
// CORE WATCHER FUNCTIONS
// ============================================

/**
 * Start watching all active folders.
 */
export function startAllWatchers(): void {
  if (!isWatcherAvailable()) {
    console.log('[WatcherService] Watchers not available (browser mode)');
    return;
  }

  const folders = getWatchedFolders({ activeOnly: true }) as WatchedFolder[];
  console.log(`[WatcherService] Starting ${folders.length} watchers...`);

  for (const folder of folders) {
    startWatcher(folder.id);
  }
}

/**
 * Stop all active watchers.
 */
export function stopAllWatchers(): void {
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
 */
export function startWatcher(folderId: number): boolean {
  if (!isWatcherAvailable() || !fs || !path) {
    console.log('[WatcherService] Cannot start watcher - not in Electron');
    return false;
  }

  // Stop existing watcher if any
  if (activeWatchers.has(folderId)) {
    stopWatcher(folderId);
  }

  const folder = getWatchedFolder(folderId) as WatchedFolder | null;
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
      (eventType: string, filename: string | null) => {
        if (eventType === 'rename' && filename) {
          handleFileEvent(folderId, folder.path, filename);
        }
      }
    );

    watcher.on('error', (error: Error) => {
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
 */
export function stopWatcher(folderId: number): void {
  const watcher = activeWatchers.get(folderId);
  if (watcher) {
    watcher.close();
    activeWatchers.delete(folderId);
    console.log(`[WatcherService] Stopped watcher for folder ${folderId}`);
  }
}

/**
 * Get the status of all watchers.
 */
export function getWatcherStatus(): WatcherStatus[] {
  const folders = getWatchedFolders() as WatchedFolder[];

  return folders.map((folder) => ({
    ...folder,
    is_running: activeWatchers.has(folder.id),
    can_run: isWatcherAvailable() && (fs?.existsSync(folder.path) ?? false),
  }));
}

// ============================================
// FILE EVENT HANDLING
// ============================================

/**
 * Handle a file system event.
 */
function handleFileEvent(folderId: number, folderPath: string, filename: string): void {
  if (!fs || !path) return;

  const fullPath = path.join(folderPath, filename);

  // Skip hidden files and system files
  if (filename.startsWith('.') || filename.startsWith('~')) {
    return;
  }

  // Skip directories
  try {
    if (!fs.existsSync(fullPath)) {
      // File was deleted, clear any pending operations
      const pending = pendingFiles.get(fullPath);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingFiles.delete(fullPath);
      }
      return;
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return;
    }

    // Clear existing debounce timer
    const existingPending = pendingFiles.get(fullPath);
    if (existingPending) {
      clearTimeout(existingPending.timeout);
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
 */
async function processFile(folderId: number, fullPath: string, filename: string): Promise<void> {
  if (!fs || !path) return;

  const folder = getWatchedFolder(folderId) as WatchedFolder | null;
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
        } as ActivityLogParams);
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
    } as ActivityLogParams);

    // Find matching rule using the matching engine
    const engine = getMatchingEngine();
    const suggestions = engine.matchFile({
      filename,
      path: fullPath,
      file_extension: extension,
      file_type: fileType,
    }) as FileSuggestion[];

    // Get best match (first suggestion, if any)
    const match: MatchResult | null =
      suggestions.length > 0
        ? {
            confidence: suggestions[0].confidence,
            targetFolder: suggestions[0].folder?.folder_number,
            ruleId: suggestions[0].rule?.id,
            ruleName: suggestions[0].rule?.name,
            folder: suggestions[0].folder,
            rule: suggestions[0].rule,
          }
        : null;

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
      } as ActivityLogParams);
      incrementWatchedFolderStats(folderId, false);

      // Emit event for UI notification
      emitWatchEvent('file_queued', { folderId, filename, path: fullPath });
      return;
    }

    // Check confidence threshold
    const matchConfidence = confidenceToNumber(match.confidence);
    const thresholdConfidence = confidenceToNumber(folder.confidence_threshold);

    if (matchConfidence < thresholdConfidence) {
      console.log(
        `[WatcherService] Match confidence ${match.confidence} below threshold ${folder.confidence_threshold}`
      );
      logWatchActivity({
        watched_folder_id: folderId,
        filename,
        path: fullPath,
        file_extension: extension,
        file_type: fileType,
        file_size: stats.size,
        action: 'queued',
        matched_rule_id: match.ruleId,
        target_folder: match.targetFolder,
      } as ActivityLogParams);
      incrementWatchedFolderStats(folderId, false);

      emitWatchEvent('file_queued', { folderId, filename, path: fullPath, suggestion: match });
      return;
    }

    // Auto-organize if enabled
    if (folder.auto_organize) {
      try {
        // Move the file (destPath is built internally by moveFile)
        const result = moveFile({
          sourcePath: fullPath,
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
            matched_rule_id: match.ruleId,
            target_folder: match.targetFolder,
          } as ActivityLogParams);
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
          throw result.error ?? new Error('Move failed');
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
          matched_rule_id: match.ruleId,
          target_folder: match.targetFolder,
          error_message: (error as Error).message,
        } as ActivityLogParams);

        emitWatchEvent('file_error', { folderId, filename, error: (error as Error).message });
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
        matched_rule_id: match.ruleId,
        target_folder: match.targetFolder,
      } as ActivityLogParams);
      incrementWatchedFolderStats(folderId, false);

      console.log(
        `[WatcherService] Queued for review: ${filename} (suggested: ${match.targetFolder})`
      );

      emitWatchEvent('file_queued', { folderId, filename, path: fullPath, suggestion: match });
    }
  } catch (error) {
    console.error(`[WatcherService] Error processing file ${filename}:`, error);
    logWatchActivity({
      watched_folder_id: folderId,
      filename,
      path: fullPath,
      action: 'error',
      error_message: (error as Error).message,
    } as ActivityLogParams);
  }
}

// ============================================
// EVENT EMISSION
// ============================================

/**
 * Subscribe to watch events.
 */
export function onWatchEvent(eventType: WatchEventType, callback: WatchEventCallback): () => void {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, new Set());
  }
  eventListeners.get(eventType)!.add(callback);

  return () => {
    eventListeners.get(eventType)?.delete(callback);
  };
}

/**
 * Emit a watch event to all subscribers.
 */
function emitWatchEvent(eventType: WatchEventType, data: WatchEventData): void {
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

// ============================================
// MANUAL OPERATIONS
// ============================================

/**
 * Manually process all files in a watched folder.
 */
export async function processExistingFiles(folderId: number): Promise<ProcessExistingResult> {
  if (!isWatcherAvailable() || !fs || !path) {
    return { success: false, error: 'Watcher not available' };
  }

  const folder = getWatchedFolder(folderId) as WatchedFolder | null;
  if (!folder) {
    return { success: false, error: 'Folder not found' };
  }

  if (!fs.existsSync(folder.path)) {
    return { success: false, error: 'Folder path does not exist' };
  }

  const results: ProcessingResults = {
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
    return { success: false, error: (error as Error).message, results };
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

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
