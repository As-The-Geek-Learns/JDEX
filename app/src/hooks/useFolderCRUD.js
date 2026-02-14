import { useState, useCallback } from 'react';
import { createFolder, updateFolder, deleteFolder, getFolder } from '../db.js';
import { useUndo, ACTION_TYPES, ENTITY_TYPES } from '../context/UndoContext.jsx';

/**
 * useFolderCRUD - Manages folder CRUD operations and editing state
 *
 * WHAT: Provides handlers for creating, updating, and deleting folders,
 *       plus state for tracking which folder is being edited.
 *
 * WHY: Extracted from App.jsx to separate folder mutation concerns.
 *      Handlers are memoized with useCallback for performance.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.triggerRefresh - Function to refresh app data after mutations
 * @param {Object|null} options.selectedFolder - Currently selected folder
 * @param {Object|null} options.selectedCategory - Currently selected category
 * @param {Function} options.navigateTo - Navigation function for post-delete redirect
 * @returns {Object} Folder CRUD handlers and editing state
 */
export function useFolderCRUD({ triggerRefresh, selectedFolder, selectedCategory, navigateTo }) {
  // Editing state
  const [editingFolder, setEditingFolder] = useState(null);

  // Undo context
  const { pushAction } = useUndo();

  /**
   * Create a new folder
   * @param {Object} folderData - Folder data to create
   */
  const handleCreateFolder = useCallback(
    (folderData) => {
      const newId = createFolder(folderData);

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
   * @param {Object} folderData - Folder data with id
   */
  const handleUpdateFolder = useCallback(
    (folderData) => {
      // Capture before state for undo
      const beforeState = getFolder(folderData.id);

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
   * @param {Object} folder - Folder to delete
   */
  const handleDeleteFolder = useCallback(
    (folder) => {
      if (confirm(`Delete folder "${folder.folder_number} ${folder.name}"?`)) {
        try {
          // Capture full state before delete for undo
          const fullFolder = getFolder(folder.id);

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
          alert(e.message);
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
