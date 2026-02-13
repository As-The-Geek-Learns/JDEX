/**
 * Watch Folders Component
 * =======================
 *
 * Manages watched folders for automatic file organization.
 * Users can add folders to monitor, configure auto-organize settings,
 * and view activity logs.
 *
 * @component
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getWatchedFolders,
  createWatchedFolder,
  updateWatchedFolder,
  deleteWatchedFolder,
  getRecentWatchActivity,
  getQueuedFileCounts,
} from '../../db.js';
import {
  initWatcherService,
  startWatcher,
  stopWatcher,
  getWatcherStatus,
  onWatchEvent,
  processExistingFiles,
} from '../../services/watcherService.js';
import { sanitizeErrorForUser } from '../../utils/errors.js';
import { useLicense, UpgradePrompt } from '../../context/LicenseContext.jsx';
import { LICENSE_TIERS } from '../../services/licenseService.js';

// =============================================================================
// Constants
// =============================================================================

const FILE_TYPE_OPTIONS = [
  { id: 'document', label: '📄 Documents', description: 'PDF, Word, Excel, etc.' },
  { id: 'image', label: '🖼️ Images', description: 'JPG, PNG, GIF, etc.' },
  { id: 'archive', label: '📦 Archives', description: 'ZIP, RAR, 7z, etc.' },
  { id: 'code', label: '💻 Code', description: 'JS, PY, HTML, etc.' },
  { id: 'video', label: '🎬 Video', description: 'MP4, MOV, AVI, etc.' },
  { id: 'audio', label: '🎵 Audio', description: 'MP3, WAV, FLAC, etc.' },
];

const CONFIDENCE_OPTIONS = [
  { id: 'low', label: 'Low', description: 'Organize with any matching rule' },
  { id: 'medium', label: 'Medium', description: 'Require good confidence match' },
  { id: 'high', label: 'High', description: 'Only organize strong matches' },
];

// =============================================================================
// Main Component
// =============================================================================

// Maximum watch folders for premium tier
const MAX_WATCH_FOLDERS = LICENSE_TIERS.PREMIUM.limits.watchFolders;

export default function WatchFolders() {
  const { isPremium, hasFeature } = useLicense();
  const [watchedFolders, setWatchedFolders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [queuedCounts, setQueuedCounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [watcherAvailable, setWatcherAvailable] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);

  // Calculate remaining slots
  const remainingSlots = MAX_WATCH_FOLDERS - watchedFolders.length;
  const canAddMore = remainingSlots > 0;

  // Load watched folder data
  const loadData = useCallback(() => {
    try {
      const folders = watcherAvailable ? getWatcherStatus() : getWatchedFolders();
      setWatchedFolders(folders);
      setActivity(getRecentWatchActivity({ limit: 20 }));
      setQueuedCounts(getQueuedFileCounts());
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
  }, [watcherAvailable]);

  // Initialize watcher service and subscribe to events - runs once on mount.
  // loadData is intentionally excluded from deps to prevent double initialization.
  useEffect(() => {
    const available = initWatcherService();
    setWatcherAvailable(available);
    loadData();

    // Subscribe to watcher events
    const unsubscribes = [
      onWatchEvent('file_organized', (data) => {
        console.log('File organized:', data);
        loadData();
      }),
      onWatchEvent('file_queued', (data) => {
        console.log('File queued:', data);
        loadData();
      }),
      onWatchEvent('file_error', (data) => {
        console.log('File error:', data);
        setError(`Error with ${data.filename}: ${data.error}`);
        loadData();
      }),
    ];

    return () => unsubscribes.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleAddFolder = useCallback(
    async (folderData) => {
      if (!hasFeature('watchFolders')) return;

      // Check limit
      if (watchedFolders.length >= MAX_WATCH_FOLDERS) {
        setError(`Maximum ${MAX_WATCH_FOLDERS} watch folders allowed`);
        return;
      }

      try {
        const id = createWatchedFolder(folderData);
        if (watcherAvailable && folderData.is_active) {
          startWatcher(id);
        }
        setShowAddModal(false);
        loadData();
      } catch (e) {
        setError(sanitizeErrorForUser(e));
      }
    },
    [hasFeature, loadData, watcherAvailable, watchedFolders.length]
  );

  const handleUpdateFolder = useCallback(
    async (id, updates) => {
      try {
        updateWatchedFolder(id, updates);

        // Handle watcher state changes
        if (watcherAvailable) {
          if (updates.is_active === true) {
            startWatcher(id);
          } else if (updates.is_active === false) {
            stopWatcher(id);
          }
        }

        setEditingFolder(null);
        loadData();
      } catch (e) {
        setError(sanitizeErrorForUser(e));
      }
    },
    [loadData, watcherAvailable]
  );

  const handleDeleteFolder = useCallback(
    async (id) => {
      if (!confirm('Are you sure you want to remove this watched folder?')) return;

      try {
        if (watcherAvailable) {
          stopWatcher(id);
        }
        deleteWatchedFolder(id);
        loadData();
      } catch (e) {
        setError(sanitizeErrorForUser(e));
      }
    },
    [loadData, watcherAvailable]
  );

  const handleProcessExisting = useCallback(
    async (id) => {
      if (!watcherAvailable) return;

      setProcessing(id);
      try {
        const result = await processExistingFiles(id);
        if (result.success) {
          setError(null);
          loadData();
        } else {
          setError(result.error);
        }
      } catch (e) {
        setError(sanitizeErrorForUser(e));
      } finally {
        setProcessing(null);
      }
    },
    [loadData, watcherAvailable]
  );

  // Premium check
  if (!isPremium) {
    return (
      <div className="p-6">
        <UpgradePrompt
          feature="Watch Folders"
          description="Automatically organize files as they arrive in your monitored folders."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Watch Folders</h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitor folders for new files and organize them automatically
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {watchedFolders.length} of {MAX_WATCH_FOLDERS} folders used
            {remainingSlots > 0 && remainingSlots <= 3 && (
              <span className="text-amber-400 ml-2">• {remainingSlots} remaining</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!canAddMore}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            canAddMore
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-slate-700 text-gray-500 cursor-not-allowed'
          }`}
          title={
            canAddMore ? 'Add a new watch folder' : `Maximum ${MAX_WATCH_FOLDERS} folders reached`
          }
        >
          <span>➕</span>
          {canAddMore ? 'Add Watch Folder' : 'Limit Reached'}
        </button>
      </div>

      {/* Status Banner */}
      {!watcherAvailable && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-medium text-amber-300">Desktop App Required</h3>
              <p className="text-sm text-amber-200/70 mt-1">
                File watching requires the JDex desktop app. In the browser, you can configure watch
                folders, but monitoring won't start until you open the desktop version.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <p className="text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            ✕
          </button>
        </div>
      )}

      {/* Watched Folders List */}
      <div className="space-y-4">
        {watchedFolders.length === 0 ? (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        ) : (
          watchedFolders.map((folder) => (
            <WatchedFolderCard
              key={folder.id}
              folder={folder}
              queuedCount={queuedCounts.find((q) => q.id === folder.id)?.queued_count || 0}
              onToggleActive={(active) => handleUpdateFolder(folder.id, { is_active: active })}
              onEdit={() => setEditingFolder(folder)}
              onDelete={() => handleDeleteFolder(folder.id)}
              onProcessExisting={() => handleProcessExisting(folder.id)}
              processing={processing === folder.id}
              watcherAvailable={watcherAvailable}
            />
          ))
        )}
      </div>

      {/* Recent Activity */}
      {activity.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
          <ActivityLog activity={activity} />
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingFolder) && (
        <WatchFolderModal
          folder={editingFolder}
          onSave={
            editingFolder ? (data) => handleUpdateFolder(editingFolder.id, data) : handleAddFolder
          }
          onClose={() => {
            setShowAddModal(false);
            setEditingFolder(null);
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="text-4xl mb-4">👁️</div>
      <h3 className="text-lg font-medium text-white mb-2">No Watch Folders Yet</h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">
        Add a folder to monitor for new files. JDex will automatically organize them based on your
        rules, or queue them for your review.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium"
      >
        Add Your First Watch Folder
      </button>
    </div>
  );
}

function WatchedFolderCard({
  folder,
  queuedCount,
  onToggleActive,
  onEdit,
  onDelete,
  onProcessExisting,
  processing,
  watcherAvailable,
}) {
  const isRunning = folder.is_running;
  const canRun = folder.can_run;

  return (
    <div
      className={`bg-slate-800 rounded-lg border p-4 transition-colors ${
        folder.is_active ? 'border-teal-600' : 'border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-white">{folder.name}</h3>

            {/* Status badges */}
            <div className="flex items-center gap-2">
              {isRunning && (
                <span
                  className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded-full 
                  flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Watching
                </span>
              )}
              {folder.is_active && !isRunning && watcherAvailable && (
                <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 text-xs rounded-full">
                  {canRun ? 'Ready' : 'Path Not Found'}
                </span>
              )}
              {!folder.is_active && (
                <span className="px-2 py-0.5 bg-slate-700 text-gray-400 text-xs rounded-full">
                  Paused
                </span>
              )}
              {folder.auto_organize ? (
                <span className="px-2 py-0.5 bg-teal-900/50 text-teal-400 text-xs rounded-full">
                  Auto-Organize
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded-full">
                  Queue Only
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-1 font-mono truncate" title={folder.path}>
            {folder.path}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-3 text-sm">
            <div className="text-gray-400">
              <span className="text-gray-500">Processed:</span>{' '}
              <span className="text-white">{folder.files_processed || 0}</span>
            </div>
            <div className="text-gray-400">
              <span className="text-gray-500">Organized:</span>{' '}
              <span className="text-teal-400">{folder.files_organized || 0}</span>
            </div>
            {queuedCount > 0 && (
              <div className="text-amber-400">
                <span className="text-amber-500">Queued:</span>{' '}
                <span className="font-medium">{queuedCount}</span>
              </div>
            )}
            {folder.last_checked_at && (
              <div className="text-gray-500 text-xs">
                Last: {new Date(folder.last_checked_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {watcherAvailable && (
            <button
              onClick={onProcessExisting}
              disabled={processing || !canRun}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 
                text-sm rounded-md transition-colors disabled:opacity-50"
              title="Process existing files in folder"
            >
              {processing ? '⏳ Processing...' : '🔄 Scan Now'}
            </button>
          )}

          <button
            onClick={() => onToggleActive(!folder.is_active)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              folder.is_active
                ? 'bg-yellow-900/50 hover:bg-yellow-900/70 text-yellow-400'
                : 'bg-green-900/50 hover:bg-green-900/70 text-green-400'
            }`}
          >
            {folder.is_active ? '⏸️ Pause' : '▶️ Start'}
          </button>

          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded"
            title="Edit"
          >
            ⚙️
          </button>

          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded"
            title="Remove"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityLog({ activity }) {
  const getActionIcon = (action) => {
    switch (action) {
      case 'detected':
        return '👀';
      case 'queued':
        return '📥';
      case 'auto_organized':
        return '✅';
      case 'skipped':
        return '⏭️';
      case 'error':
        return '❌';
      default:
        return '•';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'detected':
        return 'text-gray-400';
      case 'queued':
        return 'text-amber-400';
      case 'auto_organized':
        return 'text-green-400';
      case 'skipped':
        return 'text-gray-500';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      <div className="max-h-64 overflow-y-auto">
        {activity.map((item, index) => (
          <div
            key={item.id || index}
            className="flex items-center gap-3 px-4 py-2 border-b border-slate-700/50 
              last:border-b-0 hover:bg-slate-700/30"
          >
            <span className={getActionColor(item.action)}>{getActionIcon(item.action)}</span>
            <span className="flex-1 text-sm text-gray-300 truncate" title={item.filename}>
              {item.filename}
            </span>
            {item.target_folder && (
              <span className="text-xs text-teal-400">→ {item.target_folder}</span>
            )}
            {item.rule_name && <span className="text-xs text-gray-500">({item.rule_name})</span>}
            <span className="text-xs text-gray-500">
              {new Date(item.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Modal Component
// =============================================================================

function WatchFolderModal({ folder, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: folder?.name || '',
    path: folder?.path || '',
    is_active: folder?.is_active ?? true,
    auto_organize: folder?.auto_organize ?? false,
    confidence_threshold: folder?.confidence_threshold || 'medium',
    include_subdirs: folder?.include_subdirs ?? false,
    file_types: folder?.file_types || [],
    notify_on_organize: folder?.notify_on_organize ?? true,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleFileType = (typeId) => {
    setFormData((prev) => ({
      ...prev,
      file_types: prev.file_types.includes(typeId)
        ? prev.file_types.filter((t) => t !== typeId)
        : [...prev.file_types, typeId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-lg 
        max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">
              {folder ? 'Edit Watch Folder' : 'Add Watch Folder'}
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>

          {/* Form Body */}
          <div className="px-6 py-4 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Downloads Folder"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md 
                  text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 
                  focus:ring-teal-500"
                required
              />
            </div>

            {/* Path */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Folder Path *</label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/Users/yourname/Downloads"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md 
                  text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 
                  focus:ring-teal-500 font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Tip: In Finder, drag a folder here to paste its path
              </p>
            </div>

            {/* Auto-organize toggle */}
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">Auto-Organize</h4>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Automatically move files when a confident match is found
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, auto_organize: !formData.auto_organize })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    formData.auto_organize ? 'bg-teal-600' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.auto_organize ? 'left-7' : 'left-1'
                    }`}
                  ></span>
                </button>
              </div>

              {formData.auto_organize && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confidence Threshold
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONFIDENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, confidence_threshold: opt.id })}
                        className={`p-2 rounded-md border text-center transition-colors ${
                          formData.confidence_threshold === opt.id
                            ? 'border-teal-500 bg-teal-900/30 text-teal-400'
                            : 'border-slate-600 hover:border-slate-500 text-gray-400'
                        }`}
                      >
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs opacity-70">{opt.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
              >
                <span>{showAdvanced ? '▼' : '▶'}</span>
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-4 bg-slate-900/50 rounded-lg p-4">
                  {/* Include subdirectories */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.include_subdirs}
                      onChange={(e) =>
                        setFormData({ ...formData, include_subdirs: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 
                        text-teal-500 focus:ring-teal-500"
                    />
                    <div>
                      <span className="text-white">Include subdirectories</span>
                      <p className="text-xs text-gray-500">
                        Monitor all folders within this folder
                      </p>
                    </div>
                  </label>

                  {/* Notifications */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notify_on_organize}
                      onChange={(e) =>
                        setFormData({ ...formData, notify_on_organize: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 
                        text-teal-500 focus:ring-teal-500"
                    />
                    <div>
                      <span className="text-white">Show notifications</span>
                      <p className="text-xs text-gray-500">Get notified when files are organized</p>
                    </div>
                  </label>

                  {/* File type filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      File Type Filter (optional)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Leave empty to watch all files, or select specific types:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {FILE_TYPE_OPTIONS.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleFileType(type.id)}
                          className={`p-2 rounded border text-left text-sm transition-colors ${
                            formData.file_types.includes(type.id)
                              ? 'border-teal-500 bg-teal-900/30 text-white'
                              : 'border-slate-600 hover:border-slate-500 text-gray-400'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg 
                font-medium transition-colors"
            >
              {folder ? 'Save Changes' : 'Add Watch Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
