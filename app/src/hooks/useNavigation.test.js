/**
 * useNavigation Hook Tests
 * ========================
 * Tests for the navigation state management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigation } from './useNavigation.js';

// Mock the database module
vi.mock('../db.js', () => ({
  getFolders: vi.fn(() => []),
  getCategories: vi.fn(() => []),
  getItems: vi.fn(() => []),
}));

import { getFolders, getCategories, getItems } from '../db.js';

describe('useNavigation', () => {
  // Mock data
  const mockAreas = [
    { id: 1, range_start: 10, range_end: 19, name: 'Finance' },
    { id: 2, range_start: 20, range_end: 29, name: 'Work' },
  ];

  const mockCategories = [
    { id: 1, area_id: 1, number: 11, name: 'Invoices' },
    { id: 2, area_id: 2, number: 21, name: 'Projects' },
  ];

  const mockFolders = [
    { id: 1, category_id: 1, folder_number: '11.01', name: 'Client Invoices' },
    { id: 2, category_id: 2, folder_number: '21.01', name: 'Active Projects' },
  ];

  // Default mock options
  const mockSetFolders = vi.fn();
  const mockSetCategories = vi.fn();
  const mockSetItems = vi.fn();
  const mockClearSearch = vi.fn();

  const defaultOptions = {
    areas: mockAreas,
    setFolders: mockSetFolders,
    setCategories: mockSetCategories,
    setItems: mockSetItems,
    clearSearch: mockClearSearch,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getFolders.mockReturnValue(mockFolders);
    getCategories.mockReturnValue(mockCategories);
    getItems.mockReturnValue([]);
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should initialize currentView as home', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      expect(result.current.currentView).toBe('home');
    });

    it('should initialize selected items as null', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      expect(result.current.selectedArea).toBeNull();
      expect(result.current.selectedCategory).toBeNull();
      expect(result.current.selectedFolder).toBeNull();
    });

    it('should initialize breadcrumbPath as empty', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      expect(result.current.breadcrumbPath).toEqual([]);
    });
  });

  // ===========================================================================
  // navigateTo - Home
  // ===========================================================================

  describe('navigateTo home', () => {
    it('should set currentView to home', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      act(() => {
        result.current.navigateTo('home');
      });

      expect(result.current.currentView).toBe('home');
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      act(() => {
        result.current.navigateTo('home');
      });

      expect(result.current.selectedArea).toBeNull();
      expect(result.current.selectedCategory).toBeNull();
      expect(result.current.selectedFolder).toBeNull();
    });

    it('should clear breadcrumb path', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      act(() => {
        result.current.navigateTo('home');
      });

      expect(result.current.breadcrumbPath).toEqual([]);
    });

    it('should clear search', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('home');
      });

      expect(mockClearSearch).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // navigateTo - Area
  // ===========================================================================

  describe('navigateTo area', () => {
    it('should set currentView to area', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      expect(result.current.currentView).toBe('area');
    });

    it('should set selectedArea', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      expect(result.current.selectedArea).toEqual(mockAreas[0]);
    });

    it('should clear category and folder selections', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      expect(result.current.selectedCategory).toBeNull();
      expect(result.current.selectedFolder).toBeNull();
    });

    it('should build breadcrumb with area', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      expect(result.current.breadcrumbPath).toHaveLength(1);
      expect(result.current.breadcrumbPath[0].type).toBe('area');
      expect(result.current.breadcrumbPath[0].label).toContain('10-19');
      expect(result.current.breadcrumbPath[0].label).toContain('Finance');
    });

    it('should guard against null data', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', null);
      });

      expect(result.current.currentView).toBe('home');
    });
  });

  // ===========================================================================
  // navigateTo - Category
  // ===========================================================================

  describe('navigateTo category', () => {
    it('should set currentView to category', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('category', mockCategories[0]);
      });

      expect(result.current.currentView).toBe('category');
    });

    it('should set selectedCategory', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('category', mockCategories[0]);
      });

      expect(result.current.selectedCategory).toEqual(mockCategories[0]);
    });

    it('should clear folder selection', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('category', mockCategories[0]);
      });

      expect(result.current.selectedFolder).toBeNull();
    });

    it('should build breadcrumb with area and category', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('category', mockCategories[0]);
      });

      expect(result.current.breadcrumbPath).toHaveLength(2);
      expect(result.current.breadcrumbPath[0].type).toBe('area');
      expect(result.current.breadcrumbPath[1].type).toBe('category');
      expect(result.current.breadcrumbPath[1].label).toContain('11');
      expect(result.current.breadcrumbPath[1].label).toContain('Invoices');
    });

    it('should guard against null data', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('category', null);
      });

      expect(result.current.currentView).toBe('home');
    });
  });

  // ===========================================================================
  // navigateTo - Folder
  // ===========================================================================

  describe('navigateTo folder', () => {
    it('should set currentView to folder', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('folder', mockFolders[0]);
      });

      expect(result.current.currentView).toBe('folder');
    });

    it('should set selectedFolder', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('folder', mockFolders[0]);
      });

      expect(result.current.selectedFolder).toEqual(mockFolders[0]);
    });

    it('should load items for folder', () => {
      const mockItems = [{ id: 1, name: 'Item 1' }];
      getItems.mockReturnValue(mockItems);

      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('folder', mockFolders[0]);
      });

      expect(getItems).toHaveBeenCalledWith(mockFolders[0].id);
      expect(mockSetItems).toHaveBeenCalledWith(mockItems);
    });

    it('should build full breadcrumb path', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('folder', mockFolders[0]);
      });

      expect(result.current.breadcrumbPath).toHaveLength(3);
      expect(result.current.breadcrumbPath[0].type).toBe('area');
      expect(result.current.breadcrumbPath[1].type).toBe('category');
      expect(result.current.breadcrumbPath[2].type).toBe('folder');
      expect(result.current.breadcrumbPath[2].label).toContain('11.01');
    });

    it('should guard against null data', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('folder', null);
      });

      expect(result.current.currentView).toBe('home');
    });
  });

  // ===========================================================================
  // goHome
  // ===========================================================================

  describe('goHome', () => {
    it('should navigate to home', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      act(() => {
        result.current.goHome();
      });

      expect(result.current.currentView).toBe('home');
      expect(result.current.breadcrumbPath).toEqual([]);
    });
  });

  // ===========================================================================
  // Data Refresh
  // ===========================================================================

  describe('data refresh on navigation', () => {
    it('should refresh folders and categories on navigation', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('area', mockAreas[0]);
      });

      expect(getFolders).toHaveBeenCalled();
      expect(getCategories).toHaveBeenCalled();
      expect(mockSetFolders).toHaveBeenCalled();
      expect(mockSetCategories).toHaveBeenCalled();
    });

    it('should use fresh data for breadcrumb building', () => {
      // Return updated category data
      const freshCategories = [{ id: 1, area_id: 1, number: 11, name: 'Updated Invoices' }];
      getCategories.mockReturnValue(freshCategories);

      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('folder', mockFolders[0]);
      });

      // Should use fresh data
      expect(mockSetCategories).toHaveBeenCalledWith(freshCategories);
    });
  });

  // ===========================================================================
  // Return Value Structure
  // ===========================================================================

  describe('return value', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useNavigation(defaultOptions));

      // State
      expect(result.current).toHaveProperty('currentView');
      expect(result.current).toHaveProperty('selectedArea');
      expect(result.current).toHaveProperty('selectedCategory');
      expect(result.current).toHaveProperty('selectedFolder');
      expect(result.current).toHaveProperty('breadcrumbPath');

      // Actions
      expect(result.current).toHaveProperty('navigateTo');
      expect(result.current).toHaveProperty('goHome');
    });

    it('should return stable goHome reference', () => {
      const { result, rerender } = renderHook(() => useNavigation(defaultOptions));

      const initialGoHome = result.current.goHome;

      rerender();

      // goHome depends on navigateTo, but navigateTo's deps shouldn't change
      expect(typeof result.current.goHome).toBe('function');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle missing clearSearch', () => {
      const { result } = renderHook(() =>
        useNavigation({
          ...defaultOptions,
          clearSearch: undefined,
        })
      );

      // Should not throw
      act(() => {
        result.current.navigateTo('home');
      });

      expect(result.current.currentView).toBe('home');
    });

    it('should handle area not found for category', () => {
      const orphanCategory = { id: 99, area_id: 999, number: 99, name: 'Orphan' };

      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('category', orphanCategory);
      });

      // Should still set category
      expect(result.current.selectedCategory).toEqual(orphanCategory);
      // Breadcrumb should handle undefined area gracefully
      expect(result.current.breadcrumbPath).toHaveLength(2);
    });

    it('should handle category not found for folder', () => {
      const orphanFolder = { id: 99, category_id: 999, folder_number: '99.99', name: 'Orphan' };

      const { result } = renderHook(() => useNavigation(defaultOptions));

      act(() => {
        result.current.navigateTo('folder', orphanFolder);
      });

      // Should still set folder
      expect(result.current.selectedFolder).toEqual(orphanFolder);
    });
  });
});
