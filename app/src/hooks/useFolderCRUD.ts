import { useState, useCallback } from 'react';
import { createFolder, updateFolder, deleteFolder, getFolder } from '../db.js';
import { useUndo, ACTION_TYPES, ENTITY_TYPES } from '../context/UndoContext.jsx';
import type { Folder, Category, Sensitivity } from '../types/index.js';
import type { ViewType } from './useNavigation.js';

// Type for undo actions (UndoContext.jsx is not typed)
interface UndoAction {
  type: string;
  entityType: string;
  entityId: number;
  entityData?: Record<string, unknown>;
  previousState?: Folder | null;
  newState?: Record<string, unknown>;
  deletedEntity?: Folder | null;
  description: string;
}

interface UseUndoReturn {
  pushAction: (action: UndoAction) => void;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Folder data for creating a new folder.
 */
export interface CreateFolderData {
  folder_number: string;
  name: string;
  category_id: number;
  sequence: number;
  description?: string;
  sensitivity?: Sensitivity;
  location?: string;
  storage_path?: string;
  keywords?: string;
  notes?: string;
}

/**
 * Folder data for updating an existing folder.
 */
export interface UpdateFolderData extends Partial<CreateFolderData> {
  id: number;
}

/**
 * Options for the useFolderCRUD hook.
 */
export interface UseFolderCRUDOptions {
  triggerRefresh: () => void;
  selectedFolder: Folder | null;
  selectedCategory: Category | null;
  navigateTo: (type: ViewType, data?: Category | null) => void;
}

/**
 * Return type for the useFolderCRUD hook.
 */
export interface UseFolderCRUDReturn {
  // State
  editingFolder: Folder | null;
  setEditingFolder: (folder: Folder | null) => void;

  // Actions
  handleCreateFolder: (folderData: CreateFolderData) => void;
  handleUpdateFolder: (folderData: UpdateFolderData) => void;
  handleDeleteFolder: (folder: Folder) => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useFolderCRUD - Manages folder CRUD operations and editing state
 *
 * WHAT: Provides handlers for creating, updating, and deleting folders,
 *       plus state for tracking which folder is being edited.
 *
 * WHY: Extracted from App.jsx to separate folder mutation concerns.
 *      Handlers are memoized with useCallback for performance.
 */
export function useFolderCRUD({
  triggerRefresh,
  selectedFolder,
  selectedCategory,
  navigateTo,
}: UseFolderCRUDOptions): UseFolderCRUDReturn {
  // Editing state
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Undo context (cast since UndoContext.jsx is not typed)
  const { pushAction } = useUndo() as UseUndoReturn;

  /**
   * Create a new folder
   */
  const handleCreateFolder = useCallback(
    (folderData: CreateFolderData) => {
      const newId = createFolder(folderData) as number;

      // Push to undo stack
      pushAction({
        type: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.FOLDER,
        entityId: newId,
        entityData: { ...folderData, id: newId },
        description: `Created folder "${folderData.folder_number} ${folderData.name}"`,
      });

      triggerRefresh();
    },
    [triggerRefresh, pushAction]
  );

  /**
   * Update an existing folder
   */
  const handleUpdateFolder = useCallback(
    (folderData: UpdateFolderData) => {
      // Capture before state for undo
      const beforeState = getFolder(folderData.id) as Folder | null;

      updateFolder(folderData.id, folderData);

      // Push to undo stack
      pushAction({
        type: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.FOLDER,
        entityId: folderData.id,
        previousState: beforeState,
        newState: { ...beforeState, ...folderData },
        description: `Updated folder "${folderData.folder_number || beforeState?.folder_number} ${folderData.name || beforeState?.name}"`,
      });

      triggerRefresh();
    },
    [triggerRefresh, pushAction]
  );

  /**
   * Delete a folder with confirmation
   * If the deleted folder is currently selected, navigates back to category view
   */
  const handleDeleteFolder = useCallback(
    (folder: Folder) => {
      if (confirm(`Delete folder "${folder.folder_number} ${folder.name}"?`)) {
        try {
          // Capture full state before delete for undo
          const fullFolder = getFolder(folder.id) as Folder | null;

          deleteFolder(folder.id);

          // Push to undo stack
          pushAction({
            type: ACTION_TYPES.DELETE,
            entityType: ENTITY_TYPES.FOLDER,
            entityId: folder.id,
            deletedEntity: fullFolder,
            description: `Deleted folder "${folder.folder_number} ${folder.name}"`,
          });

          triggerRefresh();
          if (selectedFolder?.id === folder.id && typeof navigateTo === 'function') {
            navigateTo('category', selectedCategory);
          }
        } catch (e) {
          alert((e as Error).message);
        }
      }
    },
    [triggerRefresh, selectedFolder, selectedCategory, navigateTo, pushAction]
  );

  return {
    // State
    editingFolder,
    setEditingFolder,

    // Actions
    handleCreateFolder,
    handleUpdateFolder,
    handleDeleteFolder,
  };
}

export default useFolderCRUD;
