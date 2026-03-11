/**
 * useSearch Hook Tests
 * ====================
 * Tests for the search state management hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch.js';

// Mock the database module
vi.mock('../db.js', () => ({
  searchAll: vi.fn(() => ({ folders: [], items: [] })),
}));

import { searchAll } from '../db.js';

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should initialize with empty search query', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.searchQuery).toBe('');
    });

    it('should initialize with empty search results', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.searchResults).toEqual({ folders: [], items: [] });
    });
  });

  // ===========================================================================
  // setSearchQuery
  // ===========================================================================

  describe('setSearchQuery', () => {
    it('should update search query directly', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });
  });

  // ===========================================================================
  // handleSearchChange
  // ===========================================================================

  describe('handleSearchChange', () => {
    it('should update search query from input event', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleSearchChange({ target: { value: 'invoice' } });
      });

      expect(result.current.searchQuery).toBe('invoice');
    });

    it('should handle empty input', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('something');
      });

      act(() => {
        result.current.handleSearchChange({ target: { value: '' } });
      });

      expect(result.current.searchQuery).toBe('');
    });
  });

  // ===========================================================================
  // clearSearch
  // ===========================================================================

  describe('clearSearch', () => {
    it('should clear search query', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.searchQuery).toBe('test');

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
    });
  });

  // ===========================================================================
  // Search Execution (useEffect)
  // ===========================================================================

  describe('search execution', () => {
    it('should execute searchAll when query changes', () => {
      searchAll.mockReturnValue({
        folders: [{ id: 1, name: 'Test Folder' }],
        items: [{ id: 1, name: 'Test Item' }],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(searchAll).toHaveBeenCalledWith('test');
      expect(result.current.searchResults.folders).toHaveLength(1);
      expect(result.current.searchResults.items).toHaveLength(1);
    });

    it('should not execute searchAll for empty query', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('');
      });

      expect(searchAll).not.toHaveBeenCalled();
    });

    it('should not execute searchAll for whitespace-only query', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('   ');
      });

      expect(searchAll).not.toHaveBeenCalled();
    });

    it('should clear results when query is cleared', () => {
      searchAll.mockReturnValue({
        folders: [{ id: 1, name: 'Test' }],
        items: [],
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.searchResults.folders).toHaveLength(1);

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchResults).toEqual({ folders: [], items: [] });
    });

    it('should update results when query changes', () => {
      searchAll
        .mockReturnValueOnce({ folders: [{ id: 1 }], items: [] })
        .mockReturnValueOnce({ folders: [{ id: 2 }, { id: 3 }], items: [] });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('first');
      });

      expect(result.current.searchResults.folders).toHaveLength(1);

      act(() => {
        result.current.setSearchQuery('second');
      });

      expect(result.current.searchResults.folders).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Return Value Structure
  // ===========================================================================

  describe('return value', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current).toHaveProperty('searchQuery');
      expect(result.current).toHaveProperty('searchResults');
      expect(result.current).toHaveProperty('setSearchQuery');
      expect(result.current).toHaveProperty('handleSearchChange');
      expect(result.current).toHaveProperty('clearSearch');
    });

    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useSearch());

      const initialHandleSearchChange = result.current.handleSearchChange;
      const initialClearSearch = result.current.clearSearch;

      rerender();

      expect(result.current.handleSearchChange).toBe(initialHandleSearchChange);
      expect(result.current.clearSearch).toBe(initialClearSearch);
    });
  });
});
