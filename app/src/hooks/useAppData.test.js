/**
 * useAppData Hook Tests
 * =====================
 * Tests for the core application data state management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppData } from './useAppData.js';

// Mock the database module
vi.mock('../db.js', () => ({
  initDatabase: vi.fn(() => Promise.resolve()),
  getAreas: vi.fn(() => []),
  getCategories: vi.fn(() => []),
  getFolders: vi.fn(() => []),
  getStats: vi.fn(() => ({})),
}));

import { initDatabase, getAreas, getCategories, getFolders, getStats } from '../db.js';

describe('useAppData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    getAreas.mockReturnValue([]);
    getCategories.mockReturnValue([]);
    getFolders.mockReturnValue([]);
    getStats.mockReturnValue({});
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useAppData());

      expect(result.current.isLoading).toBe(true);
    });

    it('should start with empty data arrays', () => {
      const { result } = renderHook(() => useAppData());

      expect(result.current.areas).toEqual([]);
      expect(result.current.categories).toEqual([]);
      expect(result.current.folders).toEqual([]);
    });

    it('should start with empty stats object', () => {
      const { result } = renderHook(() => useAppData());

      expect(result.current.stats).toEqual({});
    });

    it('should start with refreshKey at 0', () => {
      const { result } = renderHook(() => useAppData());

      expect(result.current.refreshKey).toBe(0);
    });
  });

  // ===========================================================================
  // Database Initialization
  // ===========================================================================

  describe('database initialization', () => {
    it('should call initDatabase on mount', async () => {
      renderHook(() => useAppData());

      await waitFor(() => {
        expect(initDatabase).toHaveBeenCalledTimes(1);
      });
    });

    it('should set isLoading to false after init', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should load data after init', async () => {
      const mockAreas = [{ id: 1, name: 'Test Area' }];
      const mockCategories = [{ id: 1, name: 'Test Category' }];
      const mockFolders = [{ id: 1, name: 'Test Folder' }];
      const mockStats = { totalFolders: 1 };

      getAreas.mockReturnValue(mockAreas);
      getCategories.mockReturnValue(mockCategories);
      getFolders.mockReturnValue(mockFolders);
      getStats.mockReturnValue(mockStats);

      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.areas).toEqual(mockAreas);
      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.folders).toEqual(mockFolders);
      expect(result.current.stats).toEqual(mockStats);
    });
  });

  // ===========================================================================
  // loadData
  // ===========================================================================

  describe('loadData', () => {
    it('should reload all data from database', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to check new calls
      vi.clearAllMocks();

      const newAreas = [{ id: 2, name: 'New Area' }];
      getAreas.mockReturnValue(newAreas);

      act(() => {
        result.current.loadData();
      });

      expect(getAreas).toHaveBeenCalled();
      expect(getCategories).toHaveBeenCalled();
      expect(getFolders).toHaveBeenCalled();
      expect(getStats).toHaveBeenCalled();
      expect(result.current.areas).toEqual(newAreas);
    });
  });

  // ===========================================================================
  // triggerRefresh
  // ===========================================================================

  describe('triggerRefresh', () => {
    it('should increment refreshKey', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialKey = result.current.refreshKey;

      act(() => {
        result.current.triggerRefresh();
      });

      expect(result.current.refreshKey).toBe(initialKey + 1);
    });

    it('should trigger data reload when refreshKey changes', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks after initial load
      vi.clearAllMocks();

      act(() => {
        result.current.triggerRefresh();
      });

      // Data should be reloaded
      await waitFor(() => {
        expect(getAreas).toHaveBeenCalled();
      });
    });

    it('should increment multiple times', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.triggerRefresh();
      });

      act(() => {
        result.current.triggerRefresh();
      });

      act(() => {
        result.current.triggerRefresh();
      });

      expect(result.current.refreshKey).toBe(3);
    });
  });

  // ===========================================================================
  // Direct Setters
  // ===========================================================================

  describe('direct setters', () => {
    it('should allow direct update of areas', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newAreas = [{ id: 99, name: 'Direct Set' }];

      act(() => {
        result.current.setAreas(newAreas);
      });

      expect(result.current.areas).toEqual(newAreas);
    });

    it('should allow direct update of categories', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newCategories = [{ id: 99, name: 'Direct Set' }];

      act(() => {
        result.current.setCategories(newCategories);
      });

      expect(result.current.categories).toEqual(newCategories);
    });

    it('should allow direct update of folders', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFolders = [{ id: 99, name: 'Direct Set' }];

      act(() => {
        result.current.setFolders(newFolders);
      });

      expect(result.current.folders).toEqual(newFolders);
    });

    it('should allow direct update of stats', async () => {
      const { result } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newStats = { custom: 'stats' };

      act(() => {
        result.current.setStats(newStats);
      });

      expect(result.current.stats).toEqual(newStats);
    });
  });

  // ===========================================================================
  // Return Value Structure
  // ===========================================================================

  describe('return value', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useAppData());

      // State
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('areas');
      expect(result.current).toHaveProperty('categories');
      expect(result.current).toHaveProperty('folders');
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('refreshKey');

      // Setters
      expect(result.current).toHaveProperty('setAreas');
      expect(result.current).toHaveProperty('setCategories');
      expect(result.current).toHaveProperty('setFolders');
      expect(result.current).toHaveProperty('setStats');

      // Actions
      expect(result.current).toHaveProperty('loadData');
      expect(result.current).toHaveProperty('triggerRefresh');
    });

    it('should return stable function references', async () => {
      const { result, rerender } = renderHook(() => useAppData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLoadData = result.current.loadData;
      const initialTriggerRefresh = result.current.triggerRefresh;

      rerender();

      expect(result.current.loadData).toBe(initialLoadData);
      expect(result.current.triggerRefresh).toBe(initialTriggerRefresh);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should not reload data while still loading', async () => {
      // Make init slow
      initDatabase.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const { result } = renderHook(() => useAppData());

      // While loading, triggerRefresh should not cause data reload
      act(() => {
        result.current.triggerRefresh();
      });

      // loadData functions should only be called once (after init completes)
      expect(result.current.isLoading).toBe(true);
    });

    it('should handle unmount during initialization', async () => {
      // This test verifies the isMounted flag pattern
      initDatabase.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));

      const { unmount } = renderHook(() => useAppData());

      // Unmount before init completes
      unmount();

      // Should not throw or cause issues
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });
});
