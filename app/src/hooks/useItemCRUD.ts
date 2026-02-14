import { useState, useCallback } from 'react';
import { createItem, updateItem, deleteItem, getItems, getItem } from '../db.js';
import { useUndo, ACTION_TYPES, ENTITY_TYPES } from '../context/UndoContext.jsx';
import type { Folder, Item } from '../types/index.js';

// Type for undo actions (UndoContext.jsx is not typed)
interface UndoAction {
  type: string;
  entityType: string;
  entityId: number;
  entityData?: Record<string, unknown>;
  previousState?: Item | null;
  newState?: Record<string, unknown>;
  deletedEntity?: Item | null;
  description: string;
}

interface UseUndoReturn {
  pushAction: (action: UndoAction) => void;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Item data for creating a new item.
 */
export interface CreateItemData {
  item_number: string;
  name: string;
  folder_id: number;
  sequence: number;
  description?: string;
  file_type?: string;
  sensitivity?: string;
  location?: string;
  storage_path?: string;
  file_size?: number;
  keywords?: string;
  notes?: string;
}

/**
 * Item data for updating an existing item.
 */
export interface UpdateItemData extends Partial<CreateItemData> {
  id: number;
}

/**
 * Options for the useItemCRUD hook.
 */
export interface UseItemCRUDOptions {
  triggerRefresh: () => void;
  selectedFolder: Folder | null;
  setItems: (items: Item[]) => void;
}

/**
 * Return type for the useItemCRUD hook.
 */
export interface UseItemCRUDReturn {
  // State
  editingItem: Item | null;
  setEditingItem: (item: Item | null) => void;

  // Actions
  handleCreateItem: (itemData: CreateItemData) => void;
  handleUpdateItem: (itemData: UpdateItemData) => void;
  handleDeleteItem: (item: Item) => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useItemCRUD - Manages item CRUD operations and editing state
 *
 * WHAT: Provides handlers for creating, updating, and deleting items,
 *       plus state for tracking which item is being edited.
 *
 * WHY: Extracted from App.jsx to separate item mutation concerns.
 *      Handlers automatically refresh the items list for the current folder.
 */
export function useItemCRUD({
  triggerRefresh,
  selectedFolder,
  setItems,
}: UseItemCRUDOptions): UseItemCRUDReturn {
  // Editing state
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Undo context (cast since UndoContext.jsx is not typed)
  const { pushAction } = useUndo() as UseUndoReturn;

  /**
   * Refresh items for the current folder view
   */
  const refreshItems = useCallback(() => {
    if (selectedFolder) {
      setItems(getItems(selectedFolder.id) as Item[]);
    }
  }, [selectedFolder, setItems]);

  /**
   * Create a new item
   */
  const handleCreateItem = useCallback(
    (itemData: CreateItemData) => {
      const newId = createItem(itemData) as number;

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
   */
  const handleUpdateItem = useCallback(
    (itemData: UpdateItemData) => {
      // Capture before state for undo
      const beforeState = getItem(itemData.id) as Item | null;

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
   */
  const handleDeleteItem = useCallback(
    (item: Item) => {
      if (confirm(`Delete item "${item.item_number} ${item.name}"?`)) {
        // Capture full state before delete for undo
        const fullItem = getItem(item.id) as Item | null;

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
