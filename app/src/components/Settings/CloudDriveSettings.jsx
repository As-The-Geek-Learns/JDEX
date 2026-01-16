/**
 * Cloud Drive Settings Component
 * ===============================
 * Allows users to configure which cloud drives to use for JDex storage.
 * 
 * Features:
 * - Auto-detect installed cloud drives
 * - Enable/disable drives
 * - Set default drive
 * - Configure JD root folder within each drive
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  detectAllDrives,
  detectAndCompare,
  configureDetectedDrive,
  addCustomDrive,
  setDriveJDRoot,
  getDrivePath,
  getCloudDrives,
  getDefaultCloudDrive,
  setDefaultCloudDrive,
  updateCloudDrive,
  deleteCloudDrive,
  directoryExists,
} from '../../services/cloudDriveService.js';
import { sanitizeErrorForUser } from '../../utils/errors.js';

// =============================================================================
// Icons (using simple SVG for now)
// =============================================================================

const Icons = {
  Cloud: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  StarOutline: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
};

// =============================================================================
// Drive Type Icons/Colors
// =============================================================================

const DRIVE_STYLES = {
  icloud: { color: '#007AFF', label: 'iCloud' },
  dropbox: { color: '#0061FF', label: 'Dropbox' },
  onedrive: { color: '#0078D4', label: 'OneDrive' },
  google: { color: '#4285F4', label: 'Google' },
  proton: { color: '#6D4AFF', label: 'Proton' },
  generic: { color: '#6B7280', label: 'Custom' },
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Individual drive card component.
 */
function DriveCard({ 
  drive, 
  isConfigured, 
  isDefault, 
  onConfigure, 
  onSetDefault, 
  onRemove,
  onEditJDPath,
}) {
  const style = DRIVE_STYLES[drive.drive_type] || DRIVE_STYLES.generic;
  const path = drive.detectedPath || drive.base_path;
  const jdPath = drive.jd_root_path;
  
  return (
    <div className={`
      border rounded-lg p-4 transition-all
      ${isConfigured 
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: style.color }}
          >
            <Icons.Cloud />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {drive.name}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {style.label}
            </span>
          </div>
        </div>
        
        {/* Default star */}
        {isConfigured && (
          <button
            onClick={() => onSetDefault(drive.id)}
            className={`p-1 rounded transition-colors ${
              isDefault 
                ? 'text-yellow-500' 
                : 'text-gray-300 hover:text-yellow-400'
            }`}
            title={isDefault ? 'Default drive' : 'Set as default'}
          >
            {isDefault ? <Icons.Star /> : <Icons.StarOutline />}
          </button>
        )}
      </div>
      
      {/* Path */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-mono truncate" title={path}>
        {path}
      </div>
      
      {/* JD Root Path (if configured) */}
      {isConfigured && (
        <div className="text-sm mb-3">
          <span className="text-gray-500 dark:text-gray-400">JD Folder: </span>
          <button
            onClick={() => onEditJDPath(drive)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {jdPath || '(root)'}
          </button>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2">
        {!isConfigured ? (
          <button
            onClick={() => onConfigure(drive)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
              bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Icons.Plus />
            <span>Add</span>
          </button>
        ) : (
          <button
            onClick={() => onRemove(drive.id)}
            className="flex items-center justify-center gap-2 px-3 py-2 
              text-red-600 border border-red-300 rounded-md hover:bg-red-50 
              dark:hover:bg-red-900/20 transition-colors"
          >
            <Icons.Trash />
            <span>Remove</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Modal for editing JD root path.
 */
function JDPathModal({ drive, onSave, onClose }) {
  const [path, setPath] = useState(drive?.jd_root_path || '');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  
  const handleSave = async () => {
    setError('');
    setChecking(true);
    
    try {
      // Build full path and check if it exists
      const fullPath = path 
        ? `${drive.base_path}/${path}`
        : drive.base_path;
      
      const exists = await directoryExists(fullPath);
      
      if (!exists && path) {
        setError(`Folder not found: ${path}`);
        setChecking(false);
        return;
      }
      
      onSave(drive.id, path || null);
      onClose();
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
    
    setChecking(false);
  };
  
  if (!drive) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Set JD Folder Location
        </h2>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Specify the folder within <strong>{drive.name}</strong> where your 
          Johnny Decimal structure is located.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Folder path (relative to drive root)
          </label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="e.g., JohnnyDecimal or Documents/JD"
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 
              dark:border-gray-600 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use the drive root
          </p>
        </div>
        
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 
              dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={checking}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
              disabled:opacity-50 transition-colors"
          >
            {checking ? 'Checking...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function CloudDriveSettings() {
  // State
  const [detectedDrives, setDetectedDrives] = useState([]);
  const [configuredDrives, setConfiguredDrives] = useState([]);
  const [defaultDriveId, setDefaultDriveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [editingDrive, setEditingDrive] = useState(null);
  
  // Load data on mount
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get configured drives from database
      const configured = getCloudDrives();
      setConfiguredDrives(configured);
      
      // Get default drive
      const defaultDrive = getDefaultCloudDrive();
      setDefaultDriveId(defaultDrive?.id || null);
      
      // Detect installed drives
      const detected = await detectAllDrives();
      
      // Filter out already configured ones
      const unconfigured = detected.filter(
        d => !configured.some(c => c.id === d.id)
      );
      setDetectedDrives(unconfigured);
      
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Handlers
  const handleRescan = async () => {
    setScanning(true);
    await loadData();
    setScanning(false);
  };
  
  const handleConfigure = (drive) => {
    try {
      configureDetectedDrive(drive, {
        isDefault: configuredDrives.length === 0, // First drive becomes default
      });
      loadData();
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
  };
  
  const handleSetDefault = (driveId) => {
    try {
      setDefaultCloudDrive(driveId);
      setDefaultDriveId(driveId);
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
  };
  
  const handleRemove = (driveId) => {
    if (window.confirm('Remove this cloud drive from JDex? (This won\'t delete any files)')) {
      try {
        deleteCloudDrive(driveId);
        loadData();
      } catch (e) {
        setError(sanitizeErrorForUser(e));
      }
    }
  };
  
  const handleEditJDPath = (drive) => {
    setEditingDrive(drive);
  };
  
  const handleSaveJDPath = (driveId, path) => {
    try {
      updateCloudDrive(driveId, { jd_root_path: path });
      loadData();
    } catch (e) {
      setError(sanitizeErrorForUser(e));
    }
  };
  
  // Render
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Cloud Storage
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure where your JDex files are stored
          </p>
        </div>
        
        <button
          onClick={handleRescan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 
            border border-gray-300 dark:border-gray-600 rounded-md 
            hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <span className={scanning ? 'animate-spin' : ''}>
            <Icons.Refresh />
          </span>
          <span>Rescan</span>
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 
          dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      
      {/* Configured Drives */}
      {configuredDrives.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 
            flex items-center gap-2">
            <Icons.Check />
            Active Drives
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {configuredDrives.map(drive => (
              <DriveCard
                key={drive.id}
                drive={drive}
                isConfigured={true}
                isDefault={drive.id === defaultDriveId}
                onConfigure={handleConfigure}
                onSetDefault={handleSetDefault}
                onRemove={handleRemove}
                onEditJDPath={handleEditJDPath}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Detected (Unconfigured) Drives */}
      {detectedDrives.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 
            flex items-center gap-2">
            <Icons.Cloud />
            Available Drives
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            These cloud drives were detected on your system. Click "Add" to use them with JDex.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {detectedDrives.map(drive => (
              <DriveCard
                key={drive.id}
                drive={drive}
                isConfigured={false}
                isDefault={false}
                onConfigure={handleConfigure}
                onSetDefault={handleSetDefault}
                onRemove={handleRemove}
                onEditJDPath={handleEditJDPath}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* No drives state */}
      {configuredDrives.length === 0 && detectedDrives.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Icons.Cloud />
          <p className="mt-2">No cloud drives detected.</p>
          <p className="text-sm">
            Install iCloud, Dropbox, OneDrive, or Google Drive to get started.
          </p>
        </div>
      )}
      
      {/* Info box */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 
        dark:border-blue-800 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
          How it works
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          JDex uses your existing cloud drives to store files. Your files sync automatically 
          through the cloud service you already use. The <strong>default drive</strong> (starred) 
          is where new files go unless you specify otherwise.
        </p>
      </div>
      
      {/* JD Path Edit Modal */}
      {editingDrive && (
        <JDPathModal
          drive={editingDrive}
          onSave={handleSaveJDPath}
          onClose={() => setEditingDrive(null)}
        />
      )}
    </div>
  );
}
