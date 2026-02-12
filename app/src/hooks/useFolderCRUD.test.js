/**
 * useFolderCRUD Hook Tests
 * ========================
 * Tests for the folder CRUD operations hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFolderCRUD } from './useFolderCRUD.js';

// Mock the database module
vi.mock('../db.js', () => ({
  createFolder: vi.fn(),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));

// Mock window.confirm
const originalConfirm = globalThis.confirm;
const originalAlert = globalThis.alert;

import { createFolder, updateFolder, deleteFolder } from '../db.js';

describe('useFolderCRUD', () => {
  // Default mock options
  const mockTriggerRefresh = vi.fn();
  const mockNavigateTo = vi.fn();
  const defaultOptions = {
    triggerRefresh: mockTriggerRefresh,
    selectedFolder: null,
    selectedCategory: null,
    navigateTo: mockNavigateTo,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.confirm = vi.fn(() => true);
    globalThis.alert = vi.fn();
  });

  afterEach(() => {
    globalThis.confirm = originalConfirm;
    globalThis.alert = originalAlert;
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should initialize editingFolder as null', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      expect(result.current.editingFolder).toBeNull();
    });
  });

  // ===========================================================================
  // setEditingFolder
  // ===========================================================================

  describe('setEditingFolder', () => {
    it('should update editingFolder state', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));
      const folder = { id: 1, name: 'Test Folder' };

      act(() => {
        result.current.setEditingFolder(folder);
      });

      expect(result.current.editingFolder).toEqual(folder);
    });

    it('should allow setting to null', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      act(() => {
        result.current.setEditingFolder({ id: 1 });
      });

      act(() => {
        result.current.setEditingFolder(null);
      });

      expect(result.current.editingFolder).toBeNull();
    });
  });

  // ===========================================================================
  // handleCreateFolder
  // ===========================================================================

  describe('handleCreateFolder', () => {
    it('should call createFolder with folder data', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));
      const folderData = { name: 'New Folder', category_id: 1 };

      act(() => {
        result.current.handleCreateFolder(folderData);
      });

      expect(createFolder).toHaveBeenCalledWith(folderData);
    });

    it('should call triggerRefresh after creation', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      act(() => {
        result.current.handleCreateFolder({ name: 'Test' });
      });

      expect(mockTriggerRefresh).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // handleUpdateFolder
  // ===========================================================================

  describe('handleUpdateFolder', () => {
    it('should call updateFolder with id and data', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));
      const folderData = { id: 5, name: 'Updated Folder' };

      act(() => {
        result.current.handleUpdateFolder(folderData);
      });

      expect(updateFolder).toHaveBeenCalledWith(5, folderData);
    });

    it('should call triggerRefresh after update', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      act(() => {
        result.current.handleUpdateFolder({ id: 1, name: 'Test' });
      });

      expect(mockTriggerRefresh).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // handleDeleteFolder
  // ===========================================================================

  describe('handleDeleteFolder', () => {
    it('should show confirmation dialog', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));
      const folder = { id: 1, folder_number: '11.01', name: 'Test Folder' };

      act(() => {
        result.current.handleDeleteFolder(folder);
      });

      expect(globalThis.confirm).toHaveBeenCalled();
      expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining('11.01 Test Folder'));
    });

    it('should delete folder when confirmed', () => {
      globalThis.confirm.mockReturnValue(true);
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));
      const folder = { id: 5, folder_number: '11.01', name: 'Test' };

      act(() => {
        result.current.handleDeleteFolder(folder);
      });

      expect(deleteFolder).toHaveBeenCalledWith(5);
    });

    it('should not delete folder when cancelled', () => {
      globalThis.confirm.mockReturnValue(false);
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      act(() => {
        result.current.handleDeleteFolder({ id: 1, folder_number: '11.01', name: 'Test' });
      });

      expect(deleteFolder).not.toHaveBeenCalled();
    });

    it('should call triggerRefresh after deletion', () => {
      globalThis.confirm.mockReturnValue(true);
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      act(() => {
        result.current.handleDeleteFolder({ id: 1, folder_number: '11.01', name: 'Test' });
      });

      expect(mockTriggerRefresh).toHaveBeenCalled();
    });

    it('should navigate to category when deleting selected folder', () => {
      globalThis.confirm.mockReturnValue(true);
      const selectedFolder = { id: 1, folder_number: '11.01', name: 'Test' };
      const selectedCategory = { id: 10, name: 'Category' };

      const { result } = renderHook(() =>
        useFolderCRUD({
          ...defaultOptions,
          selectedFolder,
          selectedCategory,
        })
      );

      act(() => {
        result.current.handleDeleteFolder(selectedFolder);
      });

      expect(mockNavigateTo).toHaveBeenCalledWith('category', selectedCategory);
    });

    it('should not navigate when deleting non-selected folder', () => {
      globalThis.confirm.mockReturnValue(true);
      const selectedFolder = { id: 1, folder_number: '11.01', name: 'Test' };
      const differentFolder = { id: 2, folder_number: '11.02', name: 'Other' };

      const { result } = renderHook(() =>
        useFolderCRUD({
          ...defaultOptions,
          selectedFolder,
        })
      );

      act(() => {
        result.current.handleDeleteFolder(differentFolder);
      });

      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should show alert on deletion error', () => {
      globalThis.confirm.mockReturnValue(true);
      deleteFolder.mockImplementation(() => {
        throw new Error('Cannot delete folder');
      });

      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      act(() => {
        result.current.handleDeleteFolder({ id: 1, folder_number: '11.01', name: 'Test' });
      });

      expect(globalThis.alert).toHaveBeenCalledWith('Cannot delete folder');
    });

    it('should handle missing navigateTo function', () => {
      globalThis.confirm.mockReturnValue(true);
      const selectedFolder = { id: 1, folder_number: '11.01', name: 'Test' };

      const { result } = renderHook(() =>
        useFolderCRUD({
          ...defaultOptions,
          selectedFolder,
          navigateTo: undefined,
        })
      );

      // Should not throw
      act(() => {
        result.current.handleDeleteFolder(selectedFolder);
      });

      expect(deleteFolder).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Return Value Structure
  // ===========================================================================

  describe('return value', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useFolderCRUD(defaultOptions));

      // State
      expect(result.current).toHaveProperty('editingFolder');
      expect(result.current).toHaveProperty('setEditingFolder');

      // Actions
      expect(result.current).toHaveProperty('handleCreateFolder');
      expect(result.current).toHaveProperty('handleUpdateFolder');
      expect(result.current).toHaveProperty('handleDeleteFolder');
    });

    it('should return stable function references when deps unchanged', () => {
      const { result, rerender } = renderHook(() => useFolderCRUD(defaultOptions));

      const initialCreate = result.current.handleCreateFolder;
      const initialUpdate = result.current.handleUpdateFolder;

      rerender();

      expect(result.current.handleCreateFolder).toBe(initialCreate);
      expect(result.current.handleUpdateFolder).toBe(initialUpdate);
    });
  });
});
