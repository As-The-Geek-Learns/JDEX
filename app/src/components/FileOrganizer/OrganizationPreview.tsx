/**
 * Organization Preview Component
 * ==============================
 * Shows a preview of all proposed file moves grouped by destination folder.
 * Users can review, modify, and confirm before actual organization.
 */

import type { JSX } from 'react';
import { useState, useMemo } from 'react';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Icon component type
 */
type IconComponent = () => JSX.Element;

/**
 * File to be organized
 */
interface OrganizableFile {
  id: string | number;
  filename: string;
  user_target_folder?: string;
  suggested_jd_folder?: string;
}

/**
 * Folder for organization
 */
interface Folder {
  folder_number: string;
  name: string;
}

/**
 * Grouped files by destination folder
 */
interface FileGroup {
  folderNumber: string;
  folderName: string | null;
  files: OrganizableFile[];
}

/**
 * Props for FolderGroup component
 */
interface FolderGroupProps {
  folderNumber: string;
  folderName: string | null;
  files: OrganizableFile[];
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveFile?: (fileId: string | number) => void;
}

/**
 * Props for OrganizationPreview component
 */
export interface OrganizationPreviewProps {
  isOpen: boolean;
  files: OrganizableFile[];
  folders: Folder[];
  onClose: () => void;
  onConfirm: () => void;
  onRemoveFile?: (fileId: string | number) => void;
}

// =============================================================================
// Icons
// =============================================================================

const Icons: Record<string, IconComponent> = {
  Close: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Folder: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  ),
  ChevronDown: (): JSX.Element => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronRight: (): JSX.Element => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  File: (): JSX.Element => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  Play: (): JSX.Element => (
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
  Trash: (): JSX.Element => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
};

// =============================================================================
// Folder Group Component
// =============================================================================

function FolderGroup({
  folderNumber,
  folderName,
  files,
  isExpanded,
  onToggle,
  onRemoveFile,
}: FolderGroupProps): JSX.Element {
  const displayName = folderName || 'Unknown Folder';
  const fileCount = files.length;

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden mb-3">
      {/* Folder header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
          <Icons.Folder />
          <span className="text-teal-400 font-mono font-medium">{folderNumber}</span>
          <span className="text-white">{displayName}</span>
        </div>
        <span className="text-sm text-gray-400 bg-slate-700 px-2 py-0.5 rounded">
          {fileCount} file{fileCount !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Expanded file list */}
      {isExpanded && (
        <div className="bg-slate-900/50 divide-y divide-slate-800">
          {files.map((file, idx) => (
            <div
              key={file.id || idx}
              className="flex items-center justify-between px-4 py-2 pl-12 hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icons.File />
                <span className="text-gray-300 text-sm truncate" title={file.filename}>
                  {file.filename}
                </span>
              </div>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove from organization"
                >
                  <Icons.Trash />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Preview Component
// =============================================================================

export default function OrganizationPreview({
  isOpen,
  files,
  folders,
  onClose,
  onConfirm,
  onRemoveFile,
}: OrganizationPreviewProps): JSX.Element | null {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Group files by destination folder
  const groupedFiles = useMemo((): FileGroup[] => {
    const groups: Record<string, FileGroup> = {};

    files.forEach((file) => {
      const folderNumber = file.user_target_folder || file.suggested_jd_folder;
      if (!folderNumber) return;

      if (!groups[folderNumber]) {
        const folder = folders.find((f) => f.folder_number === folderNumber);
        groups[folderNumber] = {
          folderNumber,
          folderName: folder?.name || null,
          files: [],
        };
      }
      groups[folderNumber].files.push(file);
    });

    // Sort by folder number
    return Object.values(groups).sort((a, b) => a.folderNumber.localeCompare(b.folderNumber));
  }, [files, folders]);

  // Stats
  const totalFiles = files.length;
  const totalFolders = groupedFiles.length;

  // Toggle folder expansion
  const toggleFolder = (folderNumber: string): void => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderNumber)) {
        next.delete(folderNumber);
      } else {
        next.add(folderNumber);
      }
      return next;
    });
  };

  // Expand/collapse all
  const expandAll = (): void => {
    setExpandedFolders(new Set(groupedFiles.map((g) => g.folderNumber)));
  };

  const collapseAll = (): void => {
    setExpandedFolders(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-white">Preview Organization</h3>
            <p className="text-sm text-gray-400">
              {totalFiles} file{totalFiles !== 1 ? 's' : ''} → {totalFolders} folder
              {totalFolders !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <Icons.Close />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Collapse All
            </button>
          </div>
          <div className="text-xs text-gray-500">Review the proposed moves before proceeding</div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {groupedFiles.length > 0 ? (
            groupedFiles.map((group) => (
              <FolderGroup
                key={group.folderNumber}
                folderNumber={group.folderNumber}
                folderName={group.folderName}
                files={group.files}
                isExpanded={expandedFolders.has(group.folderNumber)}
                onToggle={() => toggleFolder(group.folderNumber)}
                onRemoveFile={onRemoveFile}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No files selected for organization</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-800">
          <div className="text-sm text-gray-400">
            Files will be moved to their destination folders
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={totalFiles === 0}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-gray-500
                text-white rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <Icons.Play />
              Organize {totalFiles} File{totalFiles !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
