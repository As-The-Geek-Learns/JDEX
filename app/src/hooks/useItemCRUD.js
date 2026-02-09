import { useState, useCallback } from 'react';
import { createItem, updateItem, deleteItem, getItems } from '../db.js';

/**
 * useItemCRUD - Manages item CRUD operations and editing state
 *
 * WHAT: Provides handlers for creating, updating, and deleting items,
 *       plus state for tracking which item is being edited.
 *
 * WHY: Extracted from App.jsx to separate item mutation concerns.
 *      Handlers automatically refresh the items list for the current folder.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.triggerRefresh - Function to refresh app data after mutations
 * @param {Object|null} options.selectedFolder - Currently selected folder
 * @param {Function} options.setItems - Function to update items state
 * @returns {Object} Item CRUD handlers and editing state
 */
export function useItemCRUD({ triggerRefresh, selectedFolder, setItems }) {
  // Editing state
  const [editingItem, setEditingItem] = useState(null);

  /**
   * Refresh items for the current folder view
   */
  const refreshItems = useCallback(() => {
    if (selectedFolder) {
      setItems(getItems(selectedFolder.id));
    }
  }, [selectedFolder, setItems]);

  /**
   * Create a new item
   * @param {Object} itemData - Item data to create
   */
  const handleCreateItem = useCallback(
    (itemData) => {
      createItem(itemData);
      triggerRefresh();
      refreshItems();
    },
    [triggerRefresh, refreshItems]
  );

  /**
   * Update an existing item
   * @param {Object} itemData - Item data with id
   */
  const handleUpdateItem = useCallback(
    (itemData) => {
      updateItem(itemData.id, itemData);
      triggerRefresh();
      refreshItems();
    },
    [triggerRefresh, refreshItems]
  );

  /**
   * Delete an item with confirmation
   * @param {Object} item - Item to delete
   */
  const handleDeleteItem = useCallback(
    (item) => {
      if (confirm(`Delete item "${item.item_number} ${item.name}"?`)) {
        deleteItem(item.id);
        triggerRefresh();
        refreshItems();
      }
    },
    [triggerRefresh, refreshItems]
  );

  return {
    // State
    editingItem,
    setEditingItem,

    // Actions
    handleCreateItem,
    handleUpdateItem,
    handleDeleteItem,
  };
}

export default useItemCRUD;
