/**
 * Scanner Panel Component
 * =======================
 * UI for scanning directories and viewing discovered files.
 * 
 * Features:
 * - Folder selection via native dialog or text input
 * - Real-time scan progress with file/size counts
 * - Results grouped by file type
 * - Cancel scan functionality
 * - Preview of scanned files
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  getScanner,
  formatFileSize,
  hasFileSystemAccess,
  listSubdirectories,
  quickCount,
} from '../../services/fileScannerService.js';
import { getCloudDrives, getScannedFiles } from '../../db.js';
import { sanitizeErrorForUser } from '../../utils/errors.js';

// =============================================================================
// Icons (Simple SVG)
// =============================================================================

const Icons = {
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  FolderOpen: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Stop: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  File: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  AlertCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// =============================================================================
// File Type Styles
// =============================================================================

const FILE_TYPE_STYLES = {
  document: { color: '#3B82F6', label: 'Documents', icon: '📄' },
  spreadsheet: { color: '#10B981', label: 'Spreadsheets', icon: '📊' },
  presentation: { color: '#F59E0B', label: 'Presentations', icon: '📽️' },
  image: { color: '#8B5CF6', label: 'Images', icon: '🖼️' },
  video: { color: '#EC4899', label: 'Videos', icon: '🎬' },
  audio: { color: '#14B8A6', label: 'Audio', icon: '🎵' },
  archive: { color: '#6B7280', label: 'Archives', icon: '📦' },
  code: { color: '#EF4444', label: 'Code', icon: '💻' },
  data: { color: '#06B6D4', label: 'Data', icon: '🗄️' },
  font: { color: '#78716C', label: 'Fonts', icon: '🔤' },
  ebook: { color: '#A855F7', label: 'eBooks', icon: '📚' },
  design: { color: '#F472B6', label: 'Design', icon: '🎨' },
  other: { color: '#9CA3AF', label: 'Other', icon: '📎' },
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Quick-access folder buttons for cloud drives.
 */
function QuickAccessFolders({ onSelect }) {
  const [drives, setDrives] = useState([]);

  useEffect(() => {
    const cloudDrives = getCloudDrives();
    setDrives(cloudDrives);
  }, []);

  if (drives.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quick access:</p>
      <div className="flex flex-wrap gap-2">
        {drives.map(drive => (
          <button
            key={drive.id}
            onClick={() => onSelect(drive.jd_root_path || drive.base_path)}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 
              rounded-md transition-colors flex items-center gap-2"
          >
            <Icons.Folder />
            {drive.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Folder browser for navigating directories.
 */
function FolderBrowser({ currentPath, onNavigate }) {
  const [subdirs, setSubdirs] = useState([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (currentPath) {
      const dirs = listSubdirectories(currentPath);
      setSubdirs(dirs);
    }
  }, [currentPath]);

  if (!currentPath || subdirs.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-2"
      >
        {expanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
        Subfolders ({subdirs.length})
      </button>
      
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
          {subdirs.slice(0, 12).map(dir => (
            <button
              key={dir.path}
              onClick={() => onNavigate(dir.path)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-left
                bg-slate-800 hover:bg-slate-700 rounded-md transition-colors truncate"
              title={dir.path}
            >
              <Icons.Folder />
              <span className="truncate">{dir.name}</span>
            </button>
          ))}
          {subdirs.length > 12 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              +{subdirs.length - 12} more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Progress indicator during scan.
 */
function ScanProgress({ progress, onCancel }) {
  const { scannedFiles, scannedDirs, totalSize, currentPath, errors } = progress;

  return (
    <div className="p-6 bg-slate-800 rounded-lg animate-pulse-subtle">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          Scanning...
        </h3>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md 
            flex items-center gap-2 transition-colors"
        >
          <Icons.Stop />
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-3 bg-slate-900 rounded-lg">
          <div className="text-2xl font-bold text-teal-400">{scannedFiles.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Files found</div>
        </div>
        <div className="p-3 bg-slate-900 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{scannedDirs.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Folders scanned</div>
        </div>
        <div className="p-3 bg-slate-900 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">{formatFileSize(totalSize)}</div>
          <div className="text-sm text-gray-400">Total size</div>
        </div>
      </div>

      <div className="text-sm text-gray-400 truncate">
        📁 {currentPath || 'Starting...'}
      </div>

      {errors.length > 0 && (
        <div className="mt-3 text-sm text-yellow-400">
          ⚠️ {errors.length} error(s) encountered
        </div>
      )}
    </div>
  );
}

/**
 * Scan results summary grouped by file type.
 */
function ScanResults({ sessionId, stats, onProceed }) {
  const [files, setFiles] = useState([]);
  const [groupedFiles, setGroupedFiles] = useState({});
  const [expandedTypes, setExpandedTypes] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      try {
        const scannedFiles = getScannedFiles(sessionId);
        setFiles(scannedFiles);

        // Group by file type
        const grouped = scannedFiles.reduce((acc, file) => {
          const type = file.file_type || 'other';
          if (!acc[type]) acc[type] = [];
          acc[type].push(file);
          return acc;
        }, {});
        setGroupedFiles(grouped);
      } catch (e) {
        console.error('Failed to load scan results:', e);
      }
      setLoading(false);
    }
  }, [sessionId]);

  const toggleType = (type) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading results...
      </div>
    );
  }

  const sortedTypes = Object.keys(groupedFiles).sort(
    (a, b) => groupedFiles[b].length - groupedFiles[a].length
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <Icons.Check />
          <span className="font-semibold">Scan Complete!</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Files:</span>{' '}
            <span className="text-white font-medium">{stats.totalFiles.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Folders:</span>{' '}
            <span className="text-white font-medium">{stats.totalDirs.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Size:</span>{' '}
            <span className="text-white font-medium">{formatFileSize(stats.totalSize)}</span>
          </div>
        </div>
      </div>

      {/* File types breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Files by Type</h4>
        
        {sortedTypes.map(type => {
          const style = FILE_TYPE_STYLES[type] || FILE_TYPE_STYLES.other;
          const typeFiles = groupedFiles[type];
          const isExpanded = expandedTypes.has(type);
          const typeSize = typeFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);

          return (
            <div key={type} className="bg-slate-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleType(type)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{style.icon}</span>
                  <span className="font-medium text-white">{style.label}</span>
                  <span className="px-2 py-0.5 bg-slate-900 rounded-full text-sm text-gray-400">
                    {typeFiles.length}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{formatFileSize(typeSize)}</span>
                  {isExpanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-slate-700">
                        <th className="pb-2">File</th>
                        <th className="pb-2 text-right">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeFiles.slice(0, 20).map((file, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50">
                          <td className="py-2 text-gray-300 truncate max-w-md" title={file.path}>
                            {file.filename}
                          </td>
                          <td className="py-2 text-right text-gray-400">
                            {formatFileSize(file.file_size || 0)}
                          </td>
                        </tr>
                      ))}
                      {typeFiles.length > 20 && (
                        <tr>
                          <td colSpan="2" className="py-2 text-center text-gray-500">
                            +{typeFiles.length - 20} more files...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <button
          onClick={() => onProceed(sessionId, files)}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md 
            font-medium transition-colors flex items-center gap-2"
        >
          Continue to Organization
          <Icons.ChevronRight />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ScannerPanel({ onScanComplete }) {
  // State
  const [scanPath, setScanPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');

  const scanner = getScanner();

  // Check for file system access
  const fsAvailable = hasFileSystemAccess();

  // Start scan
  const handleStartScan = useCallback(async () => {
    if (!scanPath.trim()) {
      setError('Please enter a folder path');
      return;
    }

    setError('');
    setIsScanning(true);
    setScanResult(null);

    const result = await scanner.scan(scanPath, {
      onProgress: (prog) => {
        setProgress(prog);
      },
      onFile: () => {
        // Could use this for real-time file list if needed
      },
      maxDepth: 15,
      saveToDb: true,
    });

    setIsScanning(false);
    setProgress(null);

    if (result.success) {
      setScanResult(result.value);
    } else {
      setError(sanitizeErrorForUser(result.error));
    }
  }, [scanPath, scanner]);

  // Cancel scan
  const handleCancel = useCallback(() => {
    scanner.cancel();
    setIsScanning(false);
    setProgress(null);
  }, [scanner]);

  // Browse for folder (uses Electron dialog if available)
  const handleBrowse = useCallback(async () => {
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { dialog } = window.require('@electron/remote') || window.require('electron').remote;
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Select Folder to Scan',
        });
        if (!result.canceled && result.filePaths.length > 0) {
          setScanPath(result.filePaths[0]);
        }
      } catch {
        // Dialog not available, user can type path manually
      }
    }
  }, []);

  // Proceed to organization
  const handleProceed = useCallback((sessionId, files) => {
    if (onScanComplete) {
      onScanComplete(sessionId, files);
    }
  }, [onScanComplete]);

  // Render
  if (!fsAvailable) {
    return (
      <div className="p-6 bg-yellow-900/30 border border-yellow-700 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <Icons.AlertCircle />
          <span className="font-semibold">File System Access Required</span>
        </div>
        <p className="text-sm text-yellow-300">
          File scanning requires running JDex as a desktop application. 
          The web version cannot access your file system.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Scan Files</h2>
        <p className="text-gray-400">
          Select a folder to scan for files. JDex will catalog them by type so you can organize them.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Scan in progress */}
      {isScanning && progress && (
        <ScanProgress progress={progress} onCancel={handleCancel} />
      )}

      {/* Scan results */}
      {!isScanning && scanResult && (
        <ScanResults
          sessionId={scanResult.sessionId}
          stats={scanResult.stats}
          onProceed={handleProceed}
        />
      )}

      {/* Folder selection (shown when not scanning and no results) */}
      {!isScanning && !scanResult && (
        <div className="space-y-4">
          <QuickAccessFolders onSelect={setScanPath} />

          {/* Path input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Folder to scan
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanPath}
                onChange={(e) => setScanPath(e.target.value)}
                placeholder="/Users/yourname/Documents"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg 
                  text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 
                  focus:ring-teal-500 font-mono text-sm"
              />
              <button
                onClick={handleBrowse}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white 
                  rounded-lg transition-colors flex items-center gap-2"
              >
                <Icons.FolderOpen />
                Browse
              </button>
            </div>
          </div>

          {/* Folder browser */}
          {scanPath && (
            <FolderBrowser currentPath={scanPath} onNavigate={setScanPath} />
          )}

          {/* Start button */}
          <button
            onClick={handleStartScan}
            disabled={!scanPath.trim()}
            className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 
              disabled:text-gray-500 text-white font-medium rounded-lg transition-colors 
              flex items-center justify-center gap-2"
          >
            <Icons.Search />
            Start Scanning
          </button>

          {/* Info */}
          <div className="p-4 bg-slate-800 rounded-lg text-sm text-gray-400">
            <p className="mb-2">
              <strong className="text-gray-300">What gets scanned:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All files in the selected folder and subfolders</li>
              <li>Files are categorized by type (documents, images, code, etc.)</li>
              <li>System folders (node_modules, .git, etc.) are skipped</li>
              <li>Hidden files are skipped</li>
            </ul>
          </div>
        </div>
      )}

      {/* New scan button (shown after results) */}
      {!isScanning && scanResult && (
        <button
          onClick={() => setScanResult(null)}
          className="text-sm text-gray-400 hover:text-white underline"
        >
          ← Scan a different folder
        </button>
      )}
    </div>
  );
}
