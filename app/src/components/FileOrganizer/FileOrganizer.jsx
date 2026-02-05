/**
 * File Organizer - Main View
 * ==========================
 * The central hub for organizing files into JD folders.
 *
 * Features:
 * - Tab-based navigation (Scan, Organize, Rules)
 * - Scanned files with suggested destinations
 * - Accept/reject/modify suggestions
 * - Batch operations
 * - Integration with matching engine
 */

import React, { useState, useCallback, useEffect } from 'react';
import ScannerPanel from './ScannerPanel.jsx';
import RulesManager from './RulesManager.jsx';
import WatchFolders from './WatchFolders.jsx';
import { getMatchingEngine, CONFIDENCE } from '../../services/matchingEngine.js';
import { formatFileSize } from '../../services/fileScannerService.js';
import {
  batchMove,
  previewOperations,
  CONFLICT_STRATEGY,
  OP_STATUS,
} from '../../services/fileOperations.js';
import { getScannedFiles, updateScannedFileDecision, getFolders } from '../../db.js';
import { sanitizeErrorForUser } from '../../utils/errors.js';

// =============================================================================
// Icons
// =============================================================================

const Icons = {
  Scan: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  Organize: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  ),
  Rules: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  ),
  Eye: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

// =============================================================================
// Confidence Badge
// =============================================================================

const CONFIDENCE_STYLES = {
  high: { bg: 'bg-green-900/50', text: 'text-green-400', label: 'High' },
  medium: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', label: 'Medium' },
  low: { bg: 'bg-orange-900/50', text: 'text-orange-400', label: 'Low' },
  none: { bg: 'bg-gray-700', text: 'text-gray-400', label: 'None' },
};

function ConfidenceBadge({ confidence }) {
  const style = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.none;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// =============================================================================
// File Row Component
// =============================================================================

function FileRow({
  file,
  suggestion,
  folders,
  isSelected,
  onSelect,
  onAccept,
  onSkip,
  onChangeFolder,
}) {
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(suggestion?.folder?.folder_number || '');

  const handleFolderChange = (folderNumber) => {
    setSelectedFolder(folderNumber);
    onChangeFolder(file.id, folderNumber);
    setShowFolderPicker(false);
  };

  const targetFolder = suggestion?.folder;
  const decision = file.user_decision;

  return (
    <div
      className={`
      border-b border-slate-700 last:border-0 py-3 px-4
      ${isSelected ? 'bg-teal-900/20' : 'hover:bg-slate-800/50'}
      ${decision === 'accepted' ? 'opacity-50' : ''}
      ${decision === 'skipped' ? 'opacity-30' : ''}
    `}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(file.id, e.target.checked)}
          disabled={decision !== 'pending'}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500 
            focus:ring-teal-500 focus:ring-offset-slate-900"
        />

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate" title={file.filename}>
              {file.filename}
            </span>
            <span className="text-xs text-gray-500">{formatFileSize(file.file_size || 0)}</span>
          </div>
          <div className="text-sm text-gray-500 truncate" title={file.path}>
            {file.path}
          </div>
        </div>

        {/* Suggestion */}
        <div className="flex items-center gap-3">
          {suggestion ? (
            <>
              <ConfidenceBadge confidence={suggestion.confidence} />

              {/* Folder selector */}
              <div className="relative">
                <button
                  onClick={() => setShowFolderPicker(!showFolderPicker)}
                  disabled={decision !== 'pending'}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 
                    rounded-md text-sm transition-colors disabled:opacity-50"
                >
                  <Icons.Folder />
                  <span className="text-teal-400 font-mono">
                    {selectedFolder || targetFolder?.folder_number || '—'}
                  </span>
                  <span className="text-white truncate max-w-32">
                    {folders.find(
                      (f) => f.folder_number === (selectedFolder || targetFolder?.folder_number)
                    )?.name || 'Select...'}
                  </span>
                  <Icons.ChevronDown />
                </button>

                {/* Dropdown */}
                {showFolderPicker && (
                  <div
                    className="absolute right-0 top-full mt-1 z-20 w-72 max-h-64 overflow-y-auto 
                    bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
                  >
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleFolderChange(folder.folder_number)}
                        className={`w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors
                          ${folder.folder_number === selectedFolder ? 'bg-teal-900/30' : ''}`}
                      >
                        <span className="text-teal-400 font-mono mr-2">{folder.folder_number}</span>
                        <span className="text-white">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reason */}
              <span
                className="text-xs text-gray-500 hidden lg:inline max-w-40 truncate"
                title={suggestion.reason}
              >
                {suggestion.reason}
              </span>
            </>
          ) : (
            <span className="text-gray-500 text-sm">No suggestion</span>
          )}
        </div>

        {/* Actions */}
        {decision === 'pending' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAccept(file.id, selectedFolder || targetFolder?.folder_number)}
              disabled={!selectedFolder && !targetFolder}
              className="p-2 hover:bg-green-900/30 rounded-md text-gray-400 hover:text-green-400 
                transition-colors disabled:opacity-30"
              title="Accept suggestion"
            >
              <Icons.Check />
            </button>
            <button
              onClick={() => onSkip(file.id)}
              className="p-2 hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-400 
                transition-colors"
              title="Skip this file"
            >
              <Icons.X />
            </button>
          </div>
        )}

        {/* Status badge */}
        {decision === 'accepted' && (
          <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">Ready</span>
        )}
        {decision === 'skipped' && (
          <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">Skipped</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Organize Panel
// =============================================================================

function OrganizePanel({ sessionId, onOrganize }) {
  const [files, setFiles] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [folders, setFolders] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('pending');

  // Load data
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const scannedFiles = getScannedFiles(sessionId);
      setFiles(scannedFiles);

      const allFolders = getFolders();
      setFolders(allFolders);

      // Get suggestions from matching engine
      const engine = getMatchingEngine();
      const matched = engine.batchMatch(scannedFiles);

      const suggestionsMap = {};
      matched.forEach(({ file, suggestions: fileSuggestions }) => {
        if (fileSuggestions.length > 0) {
          suggestionsMap[file.id] = fileSuggestions[0]; // Take best suggestion
        }
      });
      setSuggestions(suggestionsMap);

      setLoading(false);
    } catch (e) {
      setError(sanitizeErrorForUser(e));
      setLoading(false);
    }
  }, [sessionId]);

  // Handlers
  const handleSelect = useCallback((fileId, selected) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(fileId);
      } else {
        next.delete(fileId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (selected) => {
      if (selected) {
        const pending = files.filter((f) => f.user_decision === 'pending').map((f) => f.id);
        setSelectedIds(new Set(pending));
      } else {
        setSelectedIds(new Set());
      }
    },
    [files]
  );

  const handleAccept = useCallback((fileId, folderNumber) => {
    try {
      updateScannedFileDecision(fileId, 'accepted', folderNumber);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, user_decision: 'accepted', user_target_folder: folderNumber }
            : f
        )
      );
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
  }, []);

  const handleSkip = useCallback((fileId) => {
    try {
      updateScannedFileDecision(fileId, 'skipped');
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, user_decision: 'skipped' } : f))
      );
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
  }, []);

  const handleChangeFolder = useCallback((fileId, folderNumber) => {
    try {
      updateScannedFileDecision(fileId, 'changed', folderNumber);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, user_target_folder: folderNumber, user_decision: 'changed' } : f
        )
      );
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
  }, []);

  const handleAcceptSelected = useCallback(() => {
    selectedIds.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId);
      const suggestion = suggestions[fileId];
      const folder = file?.user_target_folder || suggestion?.folder?.folder_number;
      if (folder) {
        handleAccept(fileId, folder);
      }
    });
    setSelectedIds(new Set());
  }, [selectedIds, files, suggestions, handleAccept]);

  const handleSkipSelected = useCallback(() => {
    selectedIds.forEach((fileId) => handleSkip(fileId));
    setSelectedIds(new Set());
  }, [selectedIds, handleSkip]);

  const handleOrganize = useCallback(() => {
    const accepted = files.filter((f) => f.user_decision === 'accepted');
    if (accepted.length === 0) {
      setError('No files accepted for organization');
      return;
    }
    onOrganize(accepted);
  }, [files, onOrganize]);

  // Filter files
  const filteredFiles = files.filter((f) => {
    if (filterType === 'all') return true;
    if (filterType === 'pending') return f.user_decision === 'pending';
    if (filterType === 'accepted') return f.user_decision === 'accepted';
    if (filterType === 'skipped') return f.user_decision === 'skipped';
    return true;
  });

  // Stats
  const stats = {
    total: files.length,
    pending: files.filter((f) => f.user_decision === 'pending').length,
    accepted: files.filter((f) => f.user_decision === 'accepted').length,
    skipped: files.filter((f) => f.user_decision === 'skipped').length,
  };

  // No session
  if (!sessionId) {
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-4">📂</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Files to Organize</h3>
        <p className="text-gray-400">Scan a folder first to discover files for organization.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total files</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{stats.accepted}</div>
            <div className="text-xs text-gray-400">Accepted</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-500">{stats.skipped}</div>
            <div className="text-xs text-gray-400">Skipped</div>
          </div>
        </div>

        {stats.accepted > 0 && (
          <button
            onClick={handleOrganize}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md 
              font-medium transition-colors flex items-center gap-2"
          >
            <Icons.Play />
            Organize {stats.accepted} File{stats.accepted !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filter & bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['pending', 'accepted', 'skipped', 'all'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                filterType === type
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {type} ({type === 'all' ? stats.total : stats[type]})
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
            <button
              onClick={handleAcceptSelected}
              className="px-3 py-1.5 bg-green-900/50 hover:bg-green-900 text-green-400 
                rounded-md text-sm transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={handleSkipSelected}
              className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 
                rounded-md text-sm transition-colors"
            >
              Skip All
            </button>
          </div>
        )}
      </div>

      {/* Select all */}
      {filteredFiles.length > 0 && filterType === 'pending' && (
        <div className="flex items-center gap-2 px-4">
          <input
            type="checkbox"
            checked={selectedIds.size === stats.pending && stats.pending > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500"
          />
          <span className="text-sm text-gray-400">Select all pending</span>
        </div>
      )}

      {/* File list */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              suggestion={suggestions[file.id]}
              folders={folders}
              isSelected={selectedIds.has(file.id)}
              onSelect={handleSelect}
              onAccept={handleAccept}
              onSkip={handleSkip}
              onChangeFolder={handleChangeFolder}
            />
          ))
        ) : (
          <div className="p-8 text-center text-gray-400">No files match the current filter</div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Progress Modal Component
// =============================================================================

function ProgressModal({ isOpen, progress, result, onClose }) {
  if (!isOpen) return null;

  const isComplete = !!result;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            {isComplete ? 'Organization Complete' : 'Organizing Files...'}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isComplete ? (
            // Progress view
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-400">
                <span>
                  Processing file {progress?.current} of {progress?.total}
                </span>
                <span>{progress?.percent}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-200"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>

              <div className="text-sm text-gray-500 truncate">
                {progress?.currentFile || 'Starting...'}
              </div>
            </div>
          ) : (
            // Result view
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-900/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{result.success}</div>
                  <div className="text-xs text-gray-400">Moved</div>
                </div>
                <div className="p-3 bg-yellow-900/30 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">{result.skipped}</div>
                  <div className="text-xs text-gray-400">Skipped</div>
                </div>
                <div className="p-3 bg-red-900/30 rounded-lg">
                  <div className="text-2xl font-bold text-red-400">{result.failed}</div>
                  <div className="text-xs text-gray-400">Failed</div>
                </div>
              </div>

              {/* Status message */}
              {result.failed === 0 && result.success > 0 && (
                <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-center">
                  ✅ All files organized successfully!
                </div>
              )}

              {result.failed > 0 && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
                  ⚠️ {result.failed} file(s) could not be moved. Check permissions and paths.
                </div>
              )}

              {/* Details (collapsed by default) */}
              {result.operations && result.operations.length > 0 && (
                <details className="text-sm">
                  <summary className="text-gray-400 cursor-pointer hover:text-white">
                    View details ({result.operations.length} operations)
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1 bg-slate-900 rounded p-2">
                    {result.operations.slice(0, 50).map((op, idx) => (
                      <div
                        key={idx}
                        className={`text-xs py-1 px-2 rounded ${
                          op.success ? 'text-green-400' : 'text-red-400 bg-red-900/20'
                        }`}
                      >
                        {op.success ? '✓' : '✗'} {op.sourcePath?.split('/').pop()}
                        {op.error && (
                          <span className="text-red-300 ml-2">({op.error.message})</span>
                        )}
                      </div>
                    ))}
                    {result.operations.length > 50 && (
                      <div className="text-gray-500 text-center py-1">
                        +{result.operations.length - 50} more...
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isComplete && (
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white 
                rounded-md font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function FileOrganizer({ onClose }) {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanSessionId, setScanSessionId] = useState(null);
  const [organizationResult, setOrganizationResult] = useState(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeProgress, setOrganizeProgress] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // Handle scan completion
  const handleScanComplete = useCallback((sessionId, files) => {
    setScanSessionId(sessionId);
    setActiveTab('organize');
  }, []);

  // Handle organization - ACTUAL FILE MOVES
  const handleOrganize = useCallback(async (files) => {
    // Build operations list
    const operations = files
      .map((file) => ({
        sourcePath: file.path,
        folderNumber: file.user_target_folder || file.suggested_jd_folder,
      }))
      .filter((op) => op.sourcePath && op.folderNumber);

    if (operations.length === 0) {
      alert('No valid operations to perform');
      return;
    }

    // Show progress modal
    setIsOrganizing(true);
    setShowProgressModal(true);
    setOrganizeProgress({ current: 0, total: operations.length, percent: 0 });
    setOrganizationResult(null);

    // Perform batch move
    const result = await batchMove(operations, {
      onProgress: (progress) => {
        setOrganizeProgress(progress);
      },
      onFileComplete: (opResult) => {
        console.log('File complete:', opResult);
      },
      conflictStrategy: CONFLICT_STRATEGY.RENAME,
      stopOnError: false,
    });

    // Update state with result
    setIsOrganizing(false);
    setOrganizationResult(result);
  }, []);

  const tabs = [
    { id: 'scan', label: 'Scan', icon: Icons.Scan },
    { id: 'organize', label: 'Organize', icon: Icons.Organize, badge: scanSessionId ? '!' : null },
    { id: 'rules', label: 'Rules', icon: Icons.Rules },
    { id: 'watch', label: 'Watch', icon: Icons.Eye },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900 z-40 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">File Organizer</h1>
            <p className="text-sm text-gray-400">
              Scan, organize, and manage your files with Johnny Decimal
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <Icons.X />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-teal-400 border-t border-l border-r border-slate-700'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon />
                {tab.label}
                {tab.badge && <span className="w-2 h-2 bg-teal-400 rounded-full"></span>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'scan' && <ScannerPanel onScanComplete={handleScanComplete} />}

          {activeTab === 'organize' && (
            <OrganizePanel sessionId={scanSessionId} onOrganize={handleOrganize} />
          )}

          {activeTab === 'rules' && <RulesManager />}

          {activeTab === 'watch' && <WatchFolders />}
        </div>
      </main>

      {/* Footer status */}
      {scanSessionId && (
        <footer className="bg-slate-800 border-t border-slate-700 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Session: <code className="text-teal-400">{scanSessionId.substring(0, 8)}...</code>
            </span>
            <button
              onClick={() => {
                setScanSessionId(null);
                setActiveTab('scan');
              }}
              className="text-gray-400 hover:text-white underline"
            >
              Start new scan
            </button>
          </div>
        </footer>
      )}

      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgressModal}
        progress={organizeProgress}
        result={organizationResult}
        onClose={() => {
          setShowProgressModal(false);
          setOrganizationResult(null);
          // Refresh the organize panel to show updated states
          setActiveTab('organize');
        }}
      />
    </div>
  );
}
