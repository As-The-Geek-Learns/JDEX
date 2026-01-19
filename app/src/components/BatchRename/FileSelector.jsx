import React, { useState, useCallback } from 'react';
import { Folder, File, Check, X, RefreshCw } from 'lucide-react';
import { readDirectoryFiles } from '../../services/batchRenameService.js';

/**
 * FileSelector Component
 * =======================
 * Allows users to select a folder and choose files for batch renaming.
 */
export default function FileSelector({ 
  selectedFiles, 
  onFilesChange,
  maxFiles = null,
}) {
  const [folderPath, setFolderPath] = useState('');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle folder selection via Electron dialog
  const handleSelectFolder = useCallback(async () => {
    try {
      const { dialog } = window.require('@electron/remote') || {};
      
      if (!dialog) {
        // Fallback: prompt for path
        const path = window.prompt('Enter folder path:');
        if (path) {
          loadFolder(path);
        }
        return;
      }

      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select folder with files to rename',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        loadFolder(result.filePaths[0]);
      }
    } catch (err) {
      // Fallback for when @electron/remote isn't available
      const path = window.prompt('Enter folder path:');
      if (path) {
        loadFolder(path);
      }
    }
  }, []);

  // Load files from a folder
  const loadFolder = useCallback((path) => {
    setLoading(true);
    setError('');
    setFolderPath(path);
    
    try {
      const files = readDirectoryFiles(path);
      
      if (files.length === 0) {
        setError('No files found in this folder');
        setAvailableFiles([]);
        onFilesChange([]);
      } else {
        setAvailableFiles(files);
        // Auto-select all files
        onFilesChange(files);
      }
    } catch (err) {
      setError(err.message || 'Failed to read folder');
      setAvailableFiles([]);
    }
    
    setLoading(false);
  }, [onFilesChange]);

  // Toggle file selection
  const toggleFile = useCallback((file) => {
    const isSelected = selectedFiles.some(f => f.path === file.path);
    
    if (isSelected) {
      onFilesChange(selectedFiles.filter(f => f.path !== file.path));
    } else {
      if (maxFiles && selectedFiles.length >= maxFiles) {
        return; // At limit
      }
      onFilesChange([...selectedFiles, file]);
    }
  }, [selectedFiles, onFilesChange, maxFiles]);

  // Select/deselect all
  const toggleAll = useCallback(() => {
    if (selectedFiles.length === availableFiles.length) {
      onFilesChange([]);
    } else {
      const toSelect = maxFiles 
        ? availableFiles.slice(0, maxFiles) 
        : availableFiles;
      onFilesChange(toSelect);
    }
  }, [selectedFiles, availableFiles, onFilesChange, maxFiles]);

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      {/* Folder Selection */}
      <div className="flex gap-2">
        <button
          onClick={handleSelectFolder}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          <Folder size={18} />
          Choose Folder
        </button>
        
        {folderPath && (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-400 truncate">
            <span className="truncate" title={folderPath}>{folderPath}</span>
            <button
              onClick={() => loadFolder(folderPath)}
              className="p-1 hover:bg-slate-700 rounded"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4 text-slate-400">
          Loading files...
        </div>
      )}

      {/* File List */}
      {availableFiles.length > 0 && (
        <div className="space-y-2">
          {/* Selection Controls */}
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={toggleAll}
              className="text-teal-400 hover:text-teal-300"
            >
              {selectedFiles.length === availableFiles.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-slate-400">
              {selectedFiles.length} of {availableFiles.length} selected
              {maxFiles && selectedFiles.length >= maxFiles && (
                <span className="text-amber-400 ml-2">(limit: {maxFiles})</span>
              )}
            </span>
          </div>

          {/* File List */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
            {availableFiles.map((file) => {
              const isSelected = selectedFiles.some(f => f.path === file.path);
              const isDisabled = !isSelected && maxFiles && selectedFiles.length >= maxFiles;
              
              return (
                <div
                  key={file.path}
                  onClick={() => !isDisabled && toggleFile(file)}
                  className={`
                    flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors
                    border-b border-slate-700/50 last:border-b-0
                    ${isSelected ? 'bg-teal-500/10' : 'hover:bg-slate-700/30'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded border flex items-center justify-center
                    ${isSelected 
                      ? 'bg-teal-500 border-teal-500' 
                      : 'border-slate-500'
                    }
                  `}>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                  
                  <File size={16} className="text-slate-400 flex-shrink-0" />
                  
                  <span className="flex-1 truncate text-sm" title={file.name}>
                    {file.name}
                  </span>
                  
                  <span className="text-xs text-slate-500">
                    {formatSize(file.size)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && availableFiles.length === 0 && !folderPath && (
        <div className="text-center py-8 text-slate-500">
          <Folder size={32} className="mx-auto mb-2 opacity-50" />
          <p>Select a folder to see files</p>
        </div>
      )}
    </div>
  );
}
