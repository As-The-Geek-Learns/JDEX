import { useState, useCallback } from 'react';
import { createItem, updateItem, deleteItem, getItems, getItem } from '../db.js';
import { useUndo, ACTION_TYPES, ENTITY_TYPES } from '../context/UndoContext.jsx';

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

  // Undo context
  const { pushAction } = useUndo();

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
      const newId = createItem(itemData);

      // Push to undo stack
      pushAction({
        type: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.ITEM,
        entityId: newId,
        entityData: { ...itemData, id: newId },
        description: `Created item "${itemData.item_number} ${itemData.name}"`,
      });

      triggerRefresh();
      refreshItems();
    },
    [triggerRefresh, refreshItems, pushAction]
  );

  /**
   * Update an existing item
   * @param {Object} itemData - Item data with id
   */
  const handleUpdateItem = useCallback(
    (itemData) => {
      // Capture before state for undo
      const beforeState = getItem(itemData.id);

      updateItem(itemData.id, itemData);

      // Push to undo stack
      pushAction({
        type: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.ITEM,
        entityId: itemData.id,
        previousState: beforeState,
        newState: { ...beforeState, ...itemData },
        description: `Updated item "${itemData.item_number || beforeState?.item_number} ${itemData.name || beforeState?.name}"`,
      });

      triggerRefresh();
      refreshItems();
    },
    [triggerRefresh, refreshItems, pushAction]
  );

  /**
   * Delete an item with confirmation
   * @param {Object} item - Item to delete
   */
  const handleDeleteItem = useCallback(
    (item) => {
      if (confirm(`Delete item "${item.item_number} ${item.name}"?`)) {
        // Capture full state before delete for undo
        const fullItem = getItem(item.id);

        deleteItem(item.id);

        // Push to undo stack
        pushAction({
          type: ACTION_TYPES.DELETE,
          entityType: ENTITY_TYPES.ITEM,
          entityId: item.id,
          deletedEntity: fullItem,
          description: `Deleted item "${item.item_number} ${item.name}"`,
        });

        triggerRefresh();
        refreshItems();
      }
    },
    [triggerRefresh, refreshItems, pushAction]
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
