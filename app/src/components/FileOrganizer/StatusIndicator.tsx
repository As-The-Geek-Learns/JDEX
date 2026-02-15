/**
 * StatusIndicator Component
 * =========================
 * Enhanced real-time status indicators for Watch Folders.
 * Provides visual feedback for various states with animations.
 */

import type { JSX } from 'react';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Status type identifier
 */
type StatusType = 'watching' | 'syncing' | 'ready' | 'paused' | 'error' | 'notFound' | 'offline';

/**
 * Color identifier
 */
type StatusColor = 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'slate' | 'gray';

/**
 * Size variant
 */
type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Status configuration
 */
interface StatusConfigItem {
  label: string;
  color: StatusColor;
  icon: string;
  pulse?: boolean;
  spin?: boolean;
  description: string;
}

/**
 * Color class configuration
 */
interface ColorClassConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
  glow: string;
}

/**
 * Watched folder data structure
 */
interface WatchedFolder {
  is_active: boolean;
  is_running?: boolean;
  can_run?: boolean;
  auto_organize: boolean;
  last_checked_at?: string;
  files_organized?: number;
  files_processed?: number;
}

/**
 * Props for StatusBadge
 */
export interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  showDescription?: boolean;
}

/**
 * Props for ConnectionStatus
 */
export interface ConnectionStatusProps {
  isConnected: boolean;
  lastChecked?: string;
}

/**
 * Props for ActivityIndicator
 */
export interface ActivityIndicatorProps {
  filesProcessing?: number;
  filesQueued?: number;
  lastActivity?: string;
}

/**
 * Props for StatusSummaryBar
 */
export interface StatusSummaryBarProps {
  totalFolders?: number;
  activeFolders?: number;
  filesProcessedToday?: number;
  isWatcherAvailable?: boolean;
}

/**
 * Props for FolderStatus
 */
export interface FolderStatusProps {
  folder: WatchedFolder;
  queuedCount?: number;
  isProcessing?: boolean;
  watcherAvailable?: boolean;
}

// =============================================================================
// Status Definitions
// =============================================================================

const STATUS_CONFIG: Record<StatusType, StatusConfigItem> = {
  watching: {
    label: 'Watching',
    color: 'green',
    icon: '●',
    pulse: true,
    description: 'Actively monitoring for new files',
  },
  syncing: {
    label: 'Syncing',
    color: 'blue',
    icon: '↻',
    spin: true,
    description: 'Processing detected files',
  },
  ready: {
    label: 'Ready',
    color: 'yellow',
    icon: '○',
    pulse: false,
    description: 'Ready to start monitoring',
  },
  paused: {
    label: 'Paused',
    color: 'slate',
    icon: '⏸',
    pulse: false,
    description: 'Monitoring is paused',
  },
  error: {
    label: 'Error',
    color: 'red',
    icon: '!',
    pulse: true,
    description: 'An error occurred',
  },
  notFound: {
    label: 'Not Found',
    color: 'orange',
    icon: '?',
    pulse: false,
    description: 'Folder path not found',
  },
  offline: {
    label: 'Offline',
    color: 'gray',
    icon: '○',
    pulse: false,
    description: 'Watcher service not available',
  },
};

// Color class mappings
const COLOR_CLASSES: Record<StatusColor, ColorClassConfig> = {
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/50',
    dot: 'bg-green-400',
    glow: 'shadow-green-500/30',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
    dot: 'bg-blue-400',
    glow: 'shadow-blue-500/30',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/50',
    dot: 'bg-yellow-400',
    glow: 'shadow-yellow-500/30',
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/50',
    dot: 'bg-orange-400',
    glow: 'shadow-orange-500/30',
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
    dot: 'bg-red-400',
    glow: 'shadow-red-500/30',
  },
  slate: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    border: 'border-slate-500/50',
    dot: 'bg-slate-400',
    glow: 'shadow-slate-500/30',
  },
  gray: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
    dot: 'bg-gray-400',
    glow: 'shadow-gray-500/30',
  },
};

// =============================================================================
// Status Badge Component
// =============================================================================

export function StatusBadge({
  status,
  size = 'md',
  showDescription = false,
}: StatusBadgeProps): JSX.Element {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const colors = COLOR_CLASSES[config.color];

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <div className="inline-flex flex-col">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.text} ${sizeClasses[size]}`}
        title={config.description}
      >
        {/* Status dot/icon */}
        <span
          className={`inline-block ${size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full ${colors.dot} ${
            config.pulse ? 'animate-pulse' : ''
          } ${config.spin ? 'animate-spin' : ''}`}
        />
        {config.label}
      </span>
      {showDescription && (
        <span className="text-[10px] text-slate-500 mt-0.5">{config.description}</span>
      )}
    </div>
  );
}

// =============================================================================
// Connection Status Component
// =============================================================================

export function ConnectionStatus({ isConnected, lastChecked }: ConnectionStatusProps): JSX.Element {
  const colors = isConnected ? COLOR_CLASSES.green : COLOR_CLASSES.red;
  const label = isConnected ? 'Connected' : 'Disconnected';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${colors.dot} ${isConnected ? 'animate-pulse' : ''}`}
      />
      <span className={`text-xs ${colors.text}`}>{label}</span>
      {lastChecked && (
        <span className="text-xs text-slate-500">
          • {formatDistanceToNow(new Date(lastChecked), { addSuffix: true })}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Activity Indicator Component
// =============================================================================

export function ActivityIndicator({
  filesProcessing = 0,
  filesQueued = 0,
  lastActivity,
}: ActivityIndicatorProps): JSX.Element {
  const hasActivity = filesProcessing > 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Processing indicator */}
      {hasActivity && (
        <div className="flex items-center gap-1.5 text-blue-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span className="text-xs">
            Processing {filesProcessing} file{filesProcessing !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Queued indicator */}
      {filesQueued > 0 && (
        <div className="flex items-center gap-1.5 text-amber-400">
          <span className="text-xs">{filesQueued} queued</span>
        </div>
      )}

      {/* Last activity */}
      {lastActivity && !hasActivity && (
        <div className="text-xs text-slate-500">
          Last activity: {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Summary Status Bar Component
// =============================================================================

export function StatusSummaryBar({
  totalFolders = 0,
  activeFolders = 0,
  filesProcessedToday = 0,
  isWatcherAvailable = false,
}: StatusSummaryBarProps): JSX.Element {
  return (
    <div className="flex items-center gap-6 px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Service status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isWatcherAvailable ? 'bg-green-400 animate-pulse' : 'bg-slate-500'
          }`}
        />
        <span className="text-xs text-slate-400">
          {isWatcherAvailable ? 'Watcher Active' : 'Watcher Offline'}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-slate-700" />

      {/* Folder count */}
      <div className="text-xs">
        <span className="text-teal-400 font-medium">{activeFolders}</span>
        <span className="text-slate-500">/{totalFolders} folders active</span>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-slate-700" />

      {/* Today's activity */}
      <div className="text-xs">
        <span className="text-white font-medium">{filesProcessedToday}</span>
        <span className="text-slate-500"> files today</span>
      </div>
    </div>
  );
}

// =============================================================================
// Enhanced Folder Status Component
// =============================================================================

export default function FolderStatus({
  folder,
  queuedCount = 0,
  isProcessing = false,
  watcherAvailable = false,
}: FolderStatusProps): JSX.Element {
  // Determine the current status
  const getStatus = (): StatusType => {
    if (!watcherAvailable) return 'offline';
    if (isProcessing) return 'syncing';
    if (!folder.is_active) return 'paused';
    if (folder.is_running) return 'watching';
    if (!folder.can_run) return 'notFound';
    return 'ready';
  };

  const status = getStatus();

  return (
    <div className="space-y-2">
      {/* Main status badge */}
      <div className="flex items-center gap-3">
        <StatusBadge status={status} size="md" />

        {/* Mode badge */}
        {folder.auto_organize ? (
          <span className="px-2 py-0.5 bg-teal-900/50 text-teal-400 text-xs rounded-full">
            Auto
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded-full">
            Queue
          </span>
        )}
      </div>

      {/* Activity indicator */}
      <ActivityIndicator
        filesProcessing={isProcessing ? 1 : 0}
        filesQueued={queuedCount}
        lastActivity={folder.last_checked_at}
      />

      {/* Live stats bar */}
      {folder.is_running && (
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div>
            <span className="text-teal-400">{folder.files_organized || 0}</span>
            <span className="text-slate-500"> organized</span>
          </div>
          <div>
            <span className="text-white">{folder.files_processed || 0}</span>
            <span className="text-slate-500"> processed</span>
          </div>
        </div>
      )}
    </div>
  );
}
