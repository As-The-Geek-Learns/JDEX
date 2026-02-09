import { useState, useCallback } from 'react';
import { createFolder, updateFolder, deleteFolder } from '../db.js';

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

  /**
   * Create a new folder
   * @param {Object} folderData - Folder data to create
   */
  const handleCreateFolder = useCallback(
    (folderData) => {
      createFolder(folderData);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  /**
   * Update an existing folder
   * @param {Object} folderData - Folder data with id
   */
  const handleUpdateFolder = useCallback(
    (folderData) => {
      updateFolder(folderData.id, folderData);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  /**
   * Delete a folder with confirmation
   * If the deleted folder is currently selected, navigates back to category view
   * @param {Object} folder - Folder to delete
   */
  const handleDeleteFolder = useCallback(
    (folder) => {
      if (
        confirm(`Delete folder "${folder.folder_number} ${folder.name}"? This cannot be undone.`)
      ) {
        try {
          deleteFolder(folder.id);
          triggerRefresh();
          if (selectedFolder?.id === folder.id && typeof navigateTo === 'function') {
            navigateTo('category', selectedCategory);
          }
        } catch (e) {
          alert(e.message);
        }
      }
    },
    [triggerRefresh, selectedFolder, selectedCategory, navigateTo]
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
