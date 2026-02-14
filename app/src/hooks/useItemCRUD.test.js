/**
 * useItemCRUD Hook Tests
 * ======================
 * Tests for the item CRUD operations hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemCRUD } from './useItemCRUD.js';

// Mock the database module
vi.mock('../db.js', () => ({
  createItem: vi.fn(() => 1),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  getItems: vi.fn(() => []),
  getItem: vi.fn((id) => ({ id, item_number: '11.01.001', name: 'Test Item' })),
}));

// Mock the UndoContext with stable function references
const mockPushAction = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();

vi.mock('../context/UndoContext.jsx', () => ({
  useUndo: vi.fn(() => ({
    pushAction: mockPushAction,
    undo: mockUndo,
    redo: mockRedo,
    canUndo: false,
    canRedo: false,
  })),
  ACTION_TYPES: { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE' },
  ENTITY_TYPES: { FOLDER: 'folder', ITEM: 'item' },
}));

// Mock window.confirm
const originalConfirm = globalThis.confirm;

import { createItem, updateItem, deleteItem, getItems } from '../db.js';

describe('useItemCRUD', () => {
  // Default mock options
  const mockTriggerRefresh = vi.fn();
  const mockSetItems = vi.fn();
  const defaultOptions = {
    triggerRefresh: mockTriggerRefresh,
    selectedFolder: { id: 1, name: 'Test Folder' },
    setItems: mockSetItems,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    globalThis.confirm = originalConfirm;
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should initialize editingItem as null', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      expect(result.current.editingItem).toBeNull();
    });
  });

  // ===========================================================================
  // setEditingItem
  // ===========================================================================

  describe('setEditingItem', () => {
    it('should update editingItem state', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));
      const item = { id: 1, name: 'Test Item' };

      act(() => {
        result.current.setEditingItem(item);
      });

      expect(result.current.editingItem).toEqual(item);
    });

    it('should allow setting to null', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.setEditingItem({ id: 1 });
      });

      act(() => {
        result.current.setEditingItem(null);
      });

      expect(result.current.editingItem).toBeNull();
    });
  });

  // ===========================================================================
  // handleCreateItem
  // ===========================================================================

  describe('handleCreateItem', () => {
    it('should call createItem with item data', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));
      const itemData = { name: 'New Item', folder_id: 1 };

      act(() => {
        result.current.handleCreateItem(itemData);
      });

      expect(createItem).toHaveBeenCalledWith(itemData);
    });

    it('should call triggerRefresh after creation', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.handleCreateItem({ name: 'Test' });
      });

      expect(mockTriggerRefresh).toHaveBeenCalled();
    });

    it('should refresh items for current folder', () => {
      const mockItems = [{ id: 1, name: 'Item 1' }];
      getItems.mockReturnValue(mockItems);

      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.handleCreateItem({ name: 'Test' });
      });

      expect(getItems).toHaveBeenCalledWith(1); // selectedFolder.id
      expect(mockSetItems).toHaveBeenCalledWith(mockItems);
    });
  });

  // ===========================================================================
  // handleUpdateItem
  // ===========================================================================

  describe('handleUpdateItem', () => {
    it('should call updateItem with id and data', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));
      const itemData = { id: 5, name: 'Updated Item' };

      act(() => {
        result.current.handleUpdateItem(itemData);
      });

      expect(updateItem).toHaveBeenCalledWith(5, itemData);
    });

    it('should call triggerRefresh after update', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.handleUpdateItem({ id: 1, name: 'Test' });
      });

      expect(mockTriggerRefresh).toHaveBeenCalled();
    });

    it('should refresh items for current folder', () => {
      const mockItems = [{ id: 1, name: 'Updated' }];
      getItems.mockReturnValue(mockItems);

      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.handleUpdateItem({ id: 1, name: 'Test' });
      });

      expect(getItems).toHaveBeenCalledWith(1);
      expect(mockSetItems).toHaveBeenCalledWith(mockItems);
    });
  });

  // ===========================================================================
  // handleDeleteItem
  // ===========================================================================

  describe('handleDeleteItem', () => {
    it('should show confirmation dialog', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));
      const item = { id: 1, item_number: '11.01.001', name: 'Test Item' };

      act(() => {
        result.current.handleDeleteItem(item);
      });

      expect(globalThis.confirm).toHaveBeenCalled();
      expect(globalThis.confirm).toHaveBeenCalledWith(
        expect.stringContaining('11.01.001 Test Item')
      );
    });

    it('should delete item when confirmed', () => {
      globalThis.confirm.mockReturnValue(true);
      const { result } = renderHook(() => useItemCRUD(defaultOptions));
      const item = { id: 5, item_number: '11.01.001', name: 'Test' };

      act(() => {
        result.current.handleDeleteItem(item);
      });

      expect(deleteItem).toHaveBeenCalledWith(5);
    });

    it('should not delete item when cancelled', () => {
      globalThis.confirm.mockReturnValue(false);
      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.handleDeleteItem({ id: 1, item_number: '11.01.001', name: 'Test' });
      });

      expect(deleteItem).not.toHaveBeenCalled();
    });

    it('should call triggerRefresh after deletion', () => {
      globalThis.confirm.mockReturnValue(true);
      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.handleDeleteItem({ id: 1, item_number: '11.01.001', name: 'Test' });
      });

      expect(mockTriggerRefresh).toHaveBeenCalled();
    });

    it('should refresh items after deletion', () => {
      globalThis.confirm.mockReturnValue(true);
      const mockItems = [];
      getItems.mockReturnValue(mockItems);

      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      act(() => {
        result.current.handleDeleteItem({ id: 1, item_number: '11.01.001', name: 'Test' });
      });

      expect(getItems).toHaveBeenCalledWith(1);
      expect(mockSetItems).toHaveBeenCalledWith(mockItems);
    });
  });

  // ===========================================================================
  // refreshItems (internal)
  // ===========================================================================

  describe('refreshItems behavior', () => {
    it('should not refresh items if no folder is selected', () => {
      const { result } = renderHook(() =>
        useItemCRUD({
          ...defaultOptions,
          selectedFolder: null,
        })
      );

      act(() => {
        result.current.handleCreateItem({ name: 'Test' });
      });

      // getItems should not be called when selectedFolder is null
      expect(getItems).not.toHaveBeenCalled();
    });

    it('should refresh items with correct folder id', () => {
      const selectedFolder = { id: 42, name: 'Folder 42' };
      const { result } = renderHook(() =>
        useItemCRUD({
          ...defaultOptions,
          selectedFolder,
        })
      );

      act(() => {
        result.current.handleCreateItem({ name: 'Test' });
      });

      expect(getItems).toHaveBeenCalledWith(42);
    });
  });

  // ===========================================================================
  // Return Value Structure
  // ===========================================================================

  describe('return value', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useItemCRUD(defaultOptions));

      // State
      expect(result.current).toHaveProperty('editingItem');
      expect(result.current).toHaveProperty('setEditingItem');

      // Actions
      expect(result.current).toHaveProperty('handleCreateItem');
      expect(result.current).toHaveProperty('handleUpdateItem');
      expect(result.current).toHaveProperty('handleDeleteItem');
    });

    it('should return stable function references when deps unchanged', () => {
      const { result, rerender } = renderHook(() => useItemCRUD(defaultOptions));

      const initialCreate = result.current.handleCreateItem;
      const initialUpdate = result.current.handleUpdateItem;

      rerender();

      expect(result.current.handleCreateItem).toBe(initialCreate);
      expect(result.current.handleUpdateItem).toBe(initialUpdate);
    });
  });
});
