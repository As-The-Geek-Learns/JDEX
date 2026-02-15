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

import type { JSX, FormEvent, ChangeEvent } from 'react';
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
import type { FileErrorEvent } from '../../services/watcherService.js';
import { sanitizeErrorForUser } from '../../utils/errors.js';
import { useLicense, UpgradePrompt } from '../../context/LicenseContext.jsx';
import { LICENSE_TIERS } from '../../services/licenseService.js';
import FolderStatus, { StatusSummaryBar } from './StatusIndicator.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Confidence threshold level
 */
type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * File type filter ID
 */
type FileTypeId = 'document' | 'image' | 'archive' | 'code' | 'video' | 'audio';

/**
 * Activity action type
 */
type ActivityAction = 'detected' | 'queued' | 'auto_organized' | 'skipped' | 'error';

/**
 * Watched folder data structure
 */
interface WatchedFolder {
  id: number;
  name: string;
  path: string;
  is_active: boolean;
  is_running?: boolean;
  can_run?: boolean;
  auto_organize: boolean;
  confidence_threshold: ConfidenceLevel;
  include_subdirs: boolean;
  file_types: FileTypeId[];
  notify_on_organize: boolean;
  files_organized?: number;
  files_processed?: number;
  last_checked_at?: string;
}

/**
 * Watch activity log entry
 */
interface WatchActivity {
  id: number;
  action: ActivityAction;
  filename: string;
  target_folder?: string;
  rule_name?: string;
  created_at: string;
}

/**
 * Queued file count per folder
 */
interface QueuedCount {
  id: number;
  queued_count: number;
}

/**
 * Form data for watch folder modal
 */
interface WatchFolderFormData {
  name: string;
  path: string;
  is_active: boolean;
  auto_organize: boolean;
  confidence_threshold: ConfidenceLevel;
  include_subdirs: boolean;
  file_types: FileTypeId[];
  notify_on_organize: boolean;
}

/**
 * File type option config
 */
interface FileTypeOption {
  id: FileTypeId;
  label: string;
  description: string;
}

/**
 * Confidence option config
 */
interface ConfidenceOption {
  id: ConfidenceLevel;
  label: string;
  description: string;
}

/**
 * Action type config
 */
interface ActionTypeConfig {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}

/**
 * Process result
 */
interface ProcessResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  { id: 'document', label: '📄 Documents', description: 'PDF, Word, Excel, etc.' },
  { id: 'image', label: '🖼️ Images', description: 'JPG, PNG, GIF, etc.' },
  { id: 'archive', label: '📦 Archives', description: 'ZIP, RAR, 7z, etc.' },
  { id: 'code', label: '💻 Code', description: 'JS, PY, HTML, etc.' },
  { id: 'video', label: '🎬 Video', description: 'MP4, MOV, AVI, etc.' },
  { id: 'audio', label: '🎵 Audio', description: 'MP3, WAV, FLAC, etc.' },
];

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  { id: 'low', label: 'Low', description: 'Organize with any matching rule' },
  { id: 'medium', label: 'Medium', description: 'Require good confidence match' },
  { id: 'high', label: 'High', description: 'Only organize strong matches' },
];

// Activity action type config
const ACTION_TYPES: Record<ActivityAction, ActionTypeConfig> = {
  detected: { icon: '👀', label: 'Detected', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  queued: { icon: '📥', label: 'Queued', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  auto_organized: {
    icon: '✅',
    label: 'Organized',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  skipped: { icon: '⏭️', label: 'Skipped', color: 'text-gray-500', bgColor: 'bg-gray-500/20' },
  error: { icon: '❌', label: 'Error', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

// Maximum watch folders for premium tier
const MAX_WATCH_FOLDERS = LICENSE_TIERS.PREMIUM.limits.watchFolders ?? 10;

// =============================================================================
// Sub-Components Props
// =============================================================================

interface EmptyStateProps {
  onAdd: () => void;
}

interface WatchedFolderCardProps {
  folder: WatchedFolder;
  queuedCount: number;
  onToggleActive: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onProcessExisting: () => void;
  processing: boolean;
  toggling: boolean;
  watcherAvailable: boolean;
}

interface ActivityLogProps {
  activity: WatchActivity[];
}

interface WatchFolderModalProps {
  folder: WatchedFolder | null;
  onSave: (data: WatchFolderFormData) => void;
  onClose: () => void;
}

// =============================================================================
// Main Component
// =============================================================================

export default function WatchFolders(): JSX.Element {
  const { isPremium, hasFeature } = useLicense();
  const [watchedFolders, setWatchedFolders] = useState<WatchedFolder[]>([]);
  const [activity, setActivity] = useState<WatchActivity[]>([]);
  const [queuedCounts, setQueuedCounts] = useState<QueuedCount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WatchedFolder | null>(null);
  const [watcherAvailable, setWatcherAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  // Calculate remaining slots
  const remainingSlots = MAX_WATCH_FOLDERS - watchedFolders.length;
  const canAddMore = remainingSlots > 0;

  // Load watched folder data
  const loadData = useCallback(() => {
    try {
      const folders = watcherAvailable
        ? (getWatcherStatus() as WatchedFolder[])
        : (getWatchedFolders() as WatchedFolder[]);
      setWatchedFolders(folders);
      setActivity(getRecentWatchActivity({ limit: 20 }) as WatchActivity[]);
      setQueuedCounts(getQueuedFileCounts() as QueuedCount[]);
    } catch (e) {
      const errorMsg = e instanceof Error ? e : String(e);
      setError(sanitizeErrorForUser(errorMsg));
    }
  }, [watcherAvailable]);

  // Initialize watcher service and subscribe to events
  useEffect(() => {
    const available = initWatcherService();
    setWatcherAvailable(available);
    loadData();

    // Subscribe to watcher events
    const unsubscribes = [
      onWatchEvent('file_organized', () => {
        loadData();
      }),
      onWatchEvent('file_queued', () => {
        loadData();
      }),
      onWatchEvent('file_error', (data) => {
        const errorData = data as FileErrorEvent;
        setError(`Error with ${errorData.filename}: ${errorData.error}`);
        loadData();
      }),
    ];

    return () => unsubscribes.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleAddFolder = useCallback(
    async (folderData: WatchFolderFormData): Promise<void> => {
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
        const errorMsg = e instanceof Error ? e : String(e);
        setError(sanitizeErrorForUser(errorMsg));
      }
    },
    [hasFeature, loadData, watcherAvailable, watchedFolders.length]
  );

  const handleUpdateFolder = useCallback(
    async (id: number, updates: Partial<WatchFolderFormData>): Promise<void> => {
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
        const errorMsg = e instanceof Error ? e : String(e);
        setError(sanitizeErrorForUser(errorMsg));
      }
    },
    [loadData, watcherAvailable]
  );

  const handleToggleActive = useCallback(
    async (id: number, newActive: boolean, isRunning = false): Promise<void> => {
      // Confirm when pausing an actively running watcher
      if (!newActive && isRunning) {
        const confirmed = confirm(
          'This folder is actively watching for files. Are you sure you want to pause it?'
        );
        if (!confirmed) return;
      }

      setToggling(id);
      try {
        updateWatchedFolder(id, { is_active: newActive });

        if (watcherAvailable) {
          if (newActive) {
            startWatcher(id);
          } else {
            stopWatcher(id);
          }
        }

        loadData();
      } catch (e) {
        const errorMsg = e instanceof Error ? e : String(e);
        setError(sanitizeErrorForUser(errorMsg));
      } finally {
        // Brief delay for visual feedback
        setTimeout(() => setToggling(null), 300);
      }
    },
    [loadData, watcherAvailable]
  );

  // Bulk operations
  const handlePauseAll = useCallback((): void => {
    const activeFolders = watchedFolders.filter((f) => f.is_active);
    if (activeFolders.length === 0) return;

    const confirmed = confirm(
      `Pause all ${activeFolders.length} active folder${activeFolders.length > 1 ? 's' : ''}?`
    );
    if (!confirmed) return;

    activeFolders.forEach((folder) => {
      updateWatchedFolder(folder.id, { is_active: false });
      if (watcherAvailable) stopWatcher(folder.id);
    });
    loadData();
  }, [watchedFolders, loadData, watcherAvailable]);

  const handleResumeAll = useCallback((): void => {
    const pausedFolders = watchedFolders.filter((f) => !f.is_active);
    if (pausedFolders.length === 0) return;

    pausedFolders.forEach((folder) => {
      updateWatchedFolder(folder.id, { is_active: true });
      if (watcherAvailable) startWatcher(folder.id);
    });
    loadData();
  }, [watchedFolders, loadData, watcherAvailable]);

  const handleDeleteFolder = useCallback(
    async (id: number): Promise<void> => {
      if (!confirm('Are you sure you want to remove this watched folder?')) return;

      try {
        if (watcherAvailable) {
          stopWatcher(id);
        }
        deleteWatchedFolder(id);
        loadData();
      } catch (e) {
        const errorMsg = e instanceof Error ? e : String(e);
        setError(sanitizeErrorForUser(errorMsg));
      }
    },
    [loadData, watcherAvailable]
  );

  const handleProcessExisting = useCallback(
    async (id: number): Promise<void> => {
      if (!watcherAvailable) return;

      setProcessing(id);
      try {
        const result = (await processExistingFiles(id)) as ProcessResult;
        if (result.success) {
          setError(null);
          loadData();
        } else {
          setError(result.error || 'Processing failed');
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e : String(e);
        setError(sanitizeErrorForUser(errorMsg));
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
        <UpgradePrompt feature="Watch Folders" />
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
        <div className="flex items-center gap-2">
          {/* Bulk controls */}
          {watchedFolders.length > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handlePauseAll}
                disabled={!watchedFolders.some((f) => f.is_active)}
                className="px-3 py-1.5 text-xs rounded-md transition-colors
                  bg-slate-700 hover:bg-slate-600 text-gray-300
                  disabled:opacity-40 disabled:cursor-not-allowed"
                title="Pause all active folders"
              >
                ⏸️ Pause All
              </button>
              <button
                onClick={handleResumeAll}
                disabled={!watchedFolders.some((f) => !f.is_active)}
                className="px-3 py-1.5 text-xs rounded-md transition-colors
                  bg-slate-700 hover:bg-slate-600 text-gray-300
                  disabled:opacity-40 disabled:cursor-not-allowed"
                title="Resume all paused folders"
              >
                ▶️ Resume All
              </button>
            </div>
          )}
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

      {/* Summary Status Bar */}
      {watchedFolders.length > 0 && (
        <StatusSummaryBar
          totalFolders={watchedFolders.length}
          activeFolders={watchedFolders.filter((f) => f.is_active).length}
          filesProcessedToday={
            activity.filter((a) => {
              const today = new Date();
              const activityDate = new Date(a.created_at);
              return (
                activityDate.getDate() === today.getDate() &&
                activityDate.getMonth() === today.getMonth() &&
                activityDate.getFullYear() === today.getFullYear()
              );
            }).length
          }
          isWatcherAvailable={watcherAvailable}
        />
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
              onToggleActive={(active) =>
                handleToggleActive(folder.id, active, folder.is_running)
              }
              onEdit={() => setEditingFolder(folder)}
              onDelete={() => handleDeleteFolder(folder.id)}
              onProcessExisting={() => handleProcessExisting(folder.id)}
              processing={processing === folder.id}
              toggling={toggling === folder.id}
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
            editingFolder
              ? (data) => handleUpdateFolder(editingFolder.id, data)
              : handleAddFolder
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

function EmptyState({ onAdd }: EmptyStateProps): JSX.Element {
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
  toggling,
  watcherAvailable,
}: WatchedFolderCardProps): JSX.Element {
  return (
    <div
      className={`bg-slate-800 rounded-lg border p-4 transition-colors ${
        folder.is_active ? 'border-teal-600' : 'border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-white">{folder.name}</h3>
          </div>

          <p className="text-sm text-gray-400 font-mono truncate mb-3" title={folder.path}>
            {folder.path}
          </p>

          {/* Enhanced Status Indicator */}
          <FolderStatus
            folder={folder}
            queuedCount={queuedCount}
            isProcessing={processing}
            watcherAvailable={watcherAvailable}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {watcherAvailable && (
            <button
              onClick={onProcessExisting}
              disabled={processing || !folder.can_run}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300
                text-sm rounded-md transition-colors disabled:opacity-50"
              title="Process existing files in folder"
            >
              {processing ? '⏳ Processing...' : '🔄 Scan Now'}
            </button>
          )}

          <button
            onClick={() => onToggleActive(!folder.is_active)}
            disabled={toggling}
            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 min-w-[90px] ${
              toggling
                ? 'bg-slate-600 text-slate-300 cursor-wait'
                : folder.is_active
                  ? 'bg-yellow-900/50 hover:bg-yellow-900/70 text-yellow-400 hover:scale-105'
                  : 'bg-green-900/50 hover:bg-green-900/70 text-green-400 hover:scale-105'
            }`}
            title={
              toggling
                ? 'Please wait...'
                : folder.is_active
                  ? 'Pause monitoring this folder'
                  : 'Start monitoring this folder'
            }
          >
            {toggling ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                {folder.is_active ? 'Pausing...' : 'Starting...'}
              </span>
            ) : folder.is_active ? (
              '⏸️ Pause'
            ) : (
              '▶️ Start'
            )}
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

function ActivityLog({ activity }: ActivityLogProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActivityAction[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filter activity based on search and action filters
  const filteredActivity = activity.filter((item) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      item.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.target_folder?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rule_name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Action type filter
    const matchesFilter = activeFilters.length === 0 || activeFilters.includes(item.action);

    return matchesSearch && matchesFilter;
  });

  const toggleFilter = (action: ActivityAction): void => {
    setActiveFilters((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const clearFilters = (): void => {
    setSearchQuery('');
    setActiveFilters([]);
  };

  const hasActiveFilters = searchQuery || activeFilters.length > 0;

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Filter Controls */}
      <div className="px-4 py-3 border-b border-slate-700 space-y-3">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search files, folders, rules..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-600 rounded-md
                text-sm text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1
                focus:ring-teal-500"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              showFilters || activeFilters.length > 0
                ? 'bg-teal-900/50 text-teal-400'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <span>⚙️</span>
            Filter
            {activeFilters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-teal-500/30 rounded-full text-xs">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2 py-1.5 text-xs text-gray-400 hover:text-white
                hover:bg-slate-700 rounded transition-colors"
              title="Clear all filters"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Action type filter chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {(Object.entries(ACTION_TYPES) as [ActivityAction, ActionTypeConfig][]).map(
              ([action, config]) => (
                <button
                  key={action}
                  onClick={() => toggleFilter(action)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                    activeFilters.includes(action)
                      ? `${config.bgColor} ${config.color} ring-1 ring-current`
                      : 'bg-slate-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </button>
              )
            )}
          </div>
        )}

        {/* Results count */}
        {hasActiveFilters && (
          <div className="text-xs text-slate-500">
            Showing {filteredActivity.length} of {activity.length} events
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredActivity.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            {hasActiveFilters
              ? 'No matching activity found. Try adjusting your filters.'
              : 'No activity recorded yet.'}
          </div>
        ) : (
          filteredActivity.map((item, index) => {
            const actionConfig = ACTION_TYPES[item.action] || {
              icon: '•',
              label: 'Unknown',
              color: 'text-gray-400',
              bgColor: 'bg-gray-500/20',
            };
            return (
              <div
                key={item.id || index}
                className="flex items-center gap-3 px-4 py-2 border-b border-slate-700/50
                  last:border-b-0 hover:bg-slate-700/30"
              >
                <span className={actionConfig.color}>{actionConfig.icon}</span>
                <span className="flex-1 text-sm text-gray-300 truncate" title={item.filename}>
                  {item.filename}
                </span>
                {item.target_folder && (
                  <span className="text-xs text-teal-400">→ {item.target_folder}</span>
                )}
                {item.rule_name && (
                  <span className="text-xs text-gray-500">({item.rule_name})</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleTimeString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Modal Component
// =============================================================================

function WatchFolderModal({ folder, onSave, onClose }: WatchFolderModalProps): JSX.Element {
  const [formData, setFormData] = useState<WatchFolderFormData>({
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleFileType = (typeId: FileTypeId): void => {
    setFormData((prev) => ({
      ...prev,
      file_types: prev.file_types.includes(typeId)
        ? prev.file_types.filter((t) => t !== typeId)
        : [...prev.file_types, typeId],
    }));
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handlePathChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({ ...formData, path: e.target.value });
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
                onChange={handleNameChange}
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
                onChange={handlePathChange}
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
