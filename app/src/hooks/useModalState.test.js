/**
 * useModalState Hook Tests
 * ========================
 * Tests for the modal visibility state management hook.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalState } from './useModalState.js';

describe('useModalState', () => {
  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should initialize all modals as closed', () => {
      const { result } = renderHook(() => useModalState());

      expect(result.current.showNewFolderModal).toBe(false);
      expect(result.current.showNewItemModal).toBe(false);
      expect(result.current.showSettings).toBe(false);
      expect(result.current.showFileOrganizer).toBe(false);
      expect(result.current.showStatsDashboard).toBe(false);
      expect(result.current.showBatchRename).toBe(false);
    });

    it('should initialize sidebar as open', () => {
      const { result } = renderHook(() => useModalState());

      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  // ===========================================================================
  // Direct Setters
  // ===========================================================================

  describe('direct setters', () => {
    it('should allow direct control of newFolderModal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowNewFolderModal(true);
      });

      expect(result.current.showNewFolderModal).toBe(true);
    });

    it('should allow direct control of newItemModal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowNewItemModal(true);
      });

      expect(result.current.showNewItemModal).toBe(true);
    });

    it('should allow direct control of settings', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowSettings(true);
      });

      expect(result.current.showSettings).toBe(true);
    });

    it('should allow direct control of fileOrganizer', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowFileOrganizer(true);
      });

      expect(result.current.showFileOrganizer).toBe(true);
    });

    it('should allow direct control of statsDashboard', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowStatsDashboard(true);
      });

      expect(result.current.showStatsDashboard).toBe(true);
    });

    it('should allow direct control of batchRename', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowBatchRename(true);
      });

      expect(result.current.showBatchRename).toBe(true);
    });

    it('should allow direct control of sidebar', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebarOpen).toBe(false);
    });
  });

  // ===========================================================================
  // openModal
  // ===========================================================================

  describe('openModal', () => {
    it('should open newFolder modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.openModal('newFolder');
      });

      expect(result.current.showNewFolderModal).toBe(true);
    });

    it('should open newItem modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.openModal('newItem');
      });

      expect(result.current.showNewItemModal).toBe(true);
    });

    it('should open settings modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.openModal('settings');
      });

      expect(result.current.showSettings).toBe(true);
    });

    it('should open fileOrganizer modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.openModal('fileOrganizer');
      });

      expect(result.current.showFileOrganizer).toBe(true);
    });

    it('should open statsDashboard modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.openModal('statsDashboard');
      });

      expect(result.current.showStatsDashboard).toBe(true);
    });

    it('should open batchRename modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.openModal('batchRename');
      });

      expect(result.current.showBatchRename).toBe(true);
    });

    it('should ignore unknown modal names', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.openModal('unknown');
      });

      // All modals should remain closed
      expect(result.current.showNewFolderModal).toBe(false);
      expect(result.current.showNewItemModal).toBe(false);
      expect(result.current.showSettings).toBe(false);
      expect(result.current.showFileOrganizer).toBe(false);
      expect(result.current.showStatsDashboard).toBe(false);
      expect(result.current.showBatchRename).toBe(false);
    });
  });

  // ===========================================================================
  // closeModal
  // ===========================================================================

  describe('closeModal', () => {
    it('should close newFolder modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowNewFolderModal(true);
      });

      act(() => {
        result.current.closeModal('newFolder');
      });

      expect(result.current.showNewFolderModal).toBe(false);
    });

    it('should close newItem modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowNewItemModal(true);
      });

      act(() => {
        result.current.closeModal('newItem');
      });

      expect(result.current.showNewItemModal).toBe(false);
    });

    it('should close settings modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowSettings(true);
      });

      act(() => {
        result.current.closeModal('settings');
      });

      expect(result.current.showSettings).toBe(false);
    });

    it('should close fileOrganizer modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowFileOrganizer(true);
      });

      act(() => {
        result.current.closeModal('fileOrganizer');
      });

      expect(result.current.showFileOrganizer).toBe(false);
    });

    it('should close statsDashboard modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowStatsDashboard(true);
      });

      act(() => {
        result.current.closeModal('statsDashboard');
      });

      expect(result.current.showStatsDashboard).toBe(false);
    });

    it('should close batchRename modal', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowBatchRename(true);
      });

      act(() => {
        result.current.closeModal('batchRename');
      });

      expect(result.current.showBatchRename).toBe(false);
    });

    it('should ignore unknown modal names', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setShowNewFolderModal(true);
      });

      act(() => {
        result.current.closeModal('unknown');
      });

      // Original modal should remain open
      expect(result.current.showNewFolderModal).toBe(true);
    });
  });

  // ===========================================================================
  // closeAllModals
  // ===========================================================================

  describe('closeAllModals', () => {
    it('should close all open modals', () => {
      const { result } = renderHook(() => useModalState());

      // Open all modals
      act(() => {
        result.current.setShowNewFolderModal(true);
        result.current.setShowNewItemModal(true);
        result.current.setShowSettings(true);
        result.current.setShowFileOrganizer(true);
        result.current.setShowStatsDashboard(true);
        result.current.setShowBatchRename(true);
      });

      // Close all
      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.showNewFolderModal).toBe(false);
      expect(result.current.showNewItemModal).toBe(false);
      expect(result.current.showSettings).toBe(false);
      expect(result.current.showFileOrganizer).toBe(false);
      expect(result.current.showStatsDashboard).toBe(false);
      expect(result.current.showBatchRename).toBe(false);
    });

    it('should not affect sidebar state', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setSidebarOpen(true);
      });

      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.sidebarOpen).toBe(true);
    });
  });

  // ===========================================================================
  // toggleSidebar
  // ===========================================================================

  describe('toggleSidebar', () => {
    it('should toggle sidebar from open to closed', () => {
      const { result } = renderHook(() => useModalState());

      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar from closed to open', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.setSidebarOpen(false);
      });

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarOpen).toBe(false);
    });
  });

  // ===========================================================================
  // Return Value Structure
  // ===========================================================================

  describe('return value', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useModalState());

      // Modal states
      expect(result.current).toHaveProperty('showNewFolderModal');
      expect(result.current).toHaveProperty('showNewItemModal');
      expect(result.current).toHaveProperty('showSettings');
      expect(result.current).toHaveProperty('showFileOrganizer');
      expect(result.current).toHaveProperty('showStatsDashboard');
      expect(result.current).toHaveProperty('showBatchRename');

      // Setters
      expect(result.current).toHaveProperty('setShowNewFolderModal');
      expect(result.current).toHaveProperty('setShowNewItemModal');
      expect(result.current).toHaveProperty('setShowSettings');
      expect(result.current).toHaveProperty('setShowFileOrganizer');
      expect(result.current).toHaveProperty('setShowStatsDashboard');
      expect(result.current).toHaveProperty('setShowBatchRename');

      // Sidebar
      expect(result.current).toHaveProperty('sidebarOpen');
      expect(result.current).toHaveProperty('setSidebarOpen');
      expect(result.current).toHaveProperty('toggleSidebar');

      // Helper functions
      expect(result.current).toHaveProperty('openModal');
      expect(result.current).toHaveProperty('closeModal');
      expect(result.current).toHaveProperty('closeAllModals');
    });

    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useModalState());

      const initialOpenModal = result.current.openModal;
      const initialCloseModal = result.current.closeModal;
      const initialCloseAllModals = result.current.closeAllModals;
      const initialToggleSidebar = result.current.toggleSidebar;

      rerender();

      expect(result.current.openModal).toBe(initialOpenModal);
      expect(result.current.closeModal).toBe(initialCloseModal);
      expect(result.current.closeAllModals).toBe(initialCloseAllModals);
      expect(result.current.toggleSidebar).toBe(initialToggleSidebar);
    });
  });
});
