/**
 * DropZone Component
 * ==================
 * A wrapper that makes any element a valid drop target for files.
 *
 * WHAT: Drag and drop target for file organization.
 * WHY: Enables intuitive file organization by dropping files onto folders.
 */

import type { JSX, ReactNode, DragEvent } from 'react';
import { useState, useCallback } from 'react';
import { Download, CircleAlert, CheckCircle, X } from 'lucide-react';
import { useDragDrop } from '../../context/DragDropContext.js';
import { useLicense, UpgradePrompt } from '../../context/LicenseContext.js';
import {
  validateDroppedFile,
  extractFileInfo,
  buildDestinationPath,
  moveFileToFolder,
  logOrganizedFile,
  checkForConflict,
  canPerformDragDrop,
  incrementDragDropUsage,
} from '../../services/dragDropService.js';
import type { Folder } from '../../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

type DropStatus = 'success' | 'error' | 'warning' | null;

interface FileInfo {
  name: string;
  path: string;
  fileType: string;
  size: number;
}

interface ConflictData {
  fileInfo: FileInfo;
  originalDest: string;
  suggestedPath: string;
  suggestedName: string;
}

type ConflictAction = 'rename' | 'overwrite' | 'skip';

/**
 * Props for DropZone component.
 */
export interface DropZoneProps {
  folder: Folder;
  jdRootPath?: string;
  children: ReactNode;
  onSuccess?: (data: { file: FileInfo; destination: string }) => void;
  onError?: (error: string) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export default function DropZone({
  folder,
  jdRootPath = '',
  children,
  onSuccess,
  onError,
  className = '',
}: DropZoneProps): JSX.Element {
  const { isDraggingFiles, setHoverTarget, clearHoverTarget } = useDragDrop();
  const { isPremium } = useLicense();

  const [isHovering, setIsHovering] = useState(false);
  const [dropStatus, setDropStatus] = useState<DropStatus>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Handle drag enter on this specific drop zone
  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsHovering(true);
      setHoverTarget({
        type: 'folder',
        id: folder.id,
        name: folder.name,
      });
    },
    [folder, setHoverTarget]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Only set to false if we're actually leaving this element
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setIsHovering(false);
        clearHoverTarget();
      }
    },
    [clearHoverTarget]
  );

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle the actual drop
  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsHovering(false);
      clearHoverTarget();

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) {
        return;
      }

      // Check premium/free tier limits
      const usageCheck = canPerformDragDrop(isPremium);
      if (!usageCheck.allowed) {
        setShowUpgrade(true);
        setDropStatus('error');
        setStatusMessage(
          `Free tier limit reached (${usageCheck.limit}/month). Upgrade to Premium for unlimited.`
        );
        setTimeout(() => {
          setDropStatus(null);
          setStatusMessage('');
        }, 4000);
        return;
      }

      // Process the first file (can extend to multiple later)
      const file = files[0];
      const fileInfo = extractFileInfo(file);

      // Validate the file
      const validation = validateDroppedFile(fileInfo.path);
      if (!validation.valid) {
        const errorMsg = validation.error || 'Invalid file';
        setDropStatus('error');
        setStatusMessage(errorMsg);
        onError?.(errorMsg);
        setTimeout(() => {
          setDropStatus(null);
          setStatusMessage('');
        }, 3000);
        return;
      }

      // Show warning if needed
      if (validation.warning) {
        setDropStatus('warning');
        setStatusMessage(validation.warning);
        // Continue anyway after brief pause
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      try {
        // Build destination path
        const destPath = buildDestinationPath(folder, fileInfo.name, jdRootPath);

        // Check for conflicts
        const conflict = checkForConflict(destPath);
        if (conflict.exists) {
          // Show conflict modal
          setConflictData({
            fileInfo,
            originalDest: destPath,
            suggestedPath: conflict.suggestedPath || destPath,
            suggestedName: conflict.suggestedName || fileInfo.name,
          });
          setShowConflictModal(true);
          return;
        }

        // Move the file
        const result = await moveFileToFolder(fileInfo.path, destPath);

        if (result.success) {
          // Log to database for statistics
          logOrganizedFile({
            filename: fileInfo.name,
            originalPath: fileInfo.path,
            currentPath: destPath,
            jdFolderNumber: folder.folder_number,
            fileType: fileInfo.fileType,
            fileSize: fileInfo.size,
          });

          // Increment usage counter for free tier
          if (!isPremium) {
            incrementDragDropUsage();
          }

          setDropStatus('success');
          setStatusMessage(`Moved to ${folder.folder_number}`);
          onSuccess?.({ file: fileInfo, destination: destPath });

          setTimeout(() => {
            setDropStatus(null);
            setStatusMessage('');
          }, 2000);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to move file';
        setDropStatus('error');
        setStatusMessage(errorMessage);
        onError?.(errorMessage);

        setTimeout(() => {
          setDropStatus(null);
          setStatusMessage('');
        }, 3000);
      }
    },
    [folder, jdRootPath, isPremium, clearHoverTarget, onSuccess, onError]
  );

  // Handle conflict resolution
  const handleConflictResolve = async (action: ConflictAction): Promise<void> => {
    if (!conflictData) return;

    setShowConflictModal(false);

    if (action === 'skip') {
      setConflictData(null);
      return;
    }

    const { fileInfo, originalDest, suggestedPath } = conflictData;
    const finalPath = action === 'rename' ? suggestedPath : originalDest;

    try {
      // If overwrite, we need to handle deletion first
      if (action === 'overwrite') {
        const fs = (window as { require?: (mod: string) => { existsSync: (path: string) => boolean; unlinkSync: (path: string) => void } }).require?.('fs');
        if (fs?.existsSync(originalDest)) {
          fs.unlinkSync(originalDest);
        }
      }

      const result = await moveFileToFolder(fileInfo.path, finalPath);

      if (result.success) {
        logOrganizedFile({
          filename: action === 'rename' ? conflictData.suggestedName : fileInfo.name,
          originalPath: fileInfo.path,
          currentPath: finalPath,
          jdFolderNumber: folder.folder_number,
          fileType: fileInfo.fileType,
          fileSize: fileInfo.size,
        });

        if (!isPremium) {
          incrementDragDropUsage();
        }

        setDropStatus('success');
        setStatusMessage(`Moved to ${folder.folder_number}`);
        onSuccess?.({ file: fileInfo, destination: finalPath });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move file';
      setDropStatus('error');
      setStatusMessage(errorMessage);
      onError?.(errorMessage);
    }

    setConflictData(null);
    setTimeout(() => {
      setDropStatus(null);
      setStatusMessage('');
    }, 2000);
  };

  // Determine visual state
  const isActive = isDraggingFiles;
  const showDropHint = isActive && isHovering;

  return (
    <>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative transition-all duration-200
          ${isActive ? 'drop-zone-active' : ''}
          ${showDropHint ? 'drop-zone-hover' : ''}
          ${dropStatus === 'success' ? 'drop-zone-success' : ''}
          ${dropStatus === 'error' ? 'drop-zone-error' : ''}
          ${className}
        `}
      >
        {children}

        {/* Drop hint overlay */}
        {showDropHint && (
          <div className="absolute inset-0 bg-teal-500/20 border-2 border-dashed border-teal-400 rounded-lg flex items-center justify-center z-10 pointer-events-none animate-pulse">
            <div className="bg-slate-900/90 px-4 py-2 rounded-lg flex items-center gap-2">
              <Download className="text-teal-400" size={20} />
              <span className="text-teal-300 font-medium">
                Drop to organize → {folder.folder_number}
              </span>
            </div>
          </div>
        )}

        {/* Status overlay */}
        {dropStatus && (
          <div
            className={`
            absolute inset-0 flex items-center justify-center z-10 pointer-events-none rounded-lg
            ${dropStatus === 'success' ? 'bg-green-500/20 border-2 border-green-400' : ''}
            ${dropStatus === 'error' ? 'bg-red-500/20 border-2 border-red-400' : ''}
            ${dropStatus === 'warning' ? 'bg-amber-500/20 border-2 border-amber-400' : ''}
          `}
          >
            <div className="bg-slate-900/90 px-4 py-2 rounded-lg flex items-center gap-2">
              {dropStatus === 'success' && <CheckCircle className="text-green-400" size={20} />}
              {dropStatus === 'error' && <CircleAlert className="text-red-400" size={20} />}
              {dropStatus === 'warning' && <CircleAlert className="text-amber-400" size={20} />}
              <span
                className={`font-medium ${
                  dropStatus === 'success'
                    ? 'text-green-300'
                    : dropStatus === 'error'
                      ? 'text-red-300'
                      : 'text-amber-300'
                }`}
              >
                {statusMessage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Prompt Modal */}
      {showUpgrade && (
        <UpgradePrompt feature="dragDrop" onClose={() => setShowUpgrade(false)} />
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictData && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CircleAlert className="text-amber-400" size={20} />
                File Already Exists
              </h3>
              <button
                onClick={() => handleConflictResolve('skip')}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4">
              <p className="text-slate-300 mb-4">
                A file named <strong className="text-white">{conflictData.fileInfo.name}</strong>{' '}
                already exists in {folder.folder_number}.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleConflictResolve('rename')}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors text-left"
                >
                  <div className="font-medium">Keep Both</div>
                  <div className="text-sm text-teal-200">
                    Rename to: {conflictData.suggestedName}
                  </div>
                </button>

                <button
                  onClick={() => handleConflictResolve('overwrite')}
                  className="w-full px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-500 transition-colors text-left"
                >
                  <div className="font-medium">Replace Existing</div>
                  <div className="text-sm text-red-200">Overwrite the file in the destination</div>
                </button>

                <button
                  onClick={() => handleConflictResolve('skip')}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
