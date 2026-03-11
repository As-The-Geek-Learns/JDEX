import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { searchAll } from '../db.js';
import type { Folder, Item } from '../types/index.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Search results containing matched folders and items.
 */
export interface SearchResults {
  folders: Folder[];
  items: Item[];
}

/**
 * Return type for the useSearch hook.
 */
export interface UseSearchReturn {
  // State
  searchQuery: string;
  searchResults: SearchResults;

  // Actions
  setSearchQuery: (query: string) => void;
  handleSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  clearSearch: () => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useSearch - Manages search state and query execution
 *
 * WHAT: Provides search functionality with query state and results.
 *       Automatically executes searchAll when query changes.
 *
 * WHY: Extracted from App.jsx to separate search concerns from main component.
 *      Display filtering (displayFolders/displayItems) remains in App.jsx
 *      since it depends on both search and navigation state.
 */
export function useSearch(): UseSearchReturn {
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResults>({ folders: [], items: [] });

  /**
   * Handle search input changes
   */
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  /**
   * Clear the search query
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  /**
   * Execute search when query changes
   */
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchAll(searchQuery) as SearchResults;
      setSearchResults(results);
    } else {
      setSearchResults({ folders: [], items: [] });
    }
  }, [searchQuery]);

  return {
    // State
    searchQuery,
    searchResults,

    // Actions
    setSearchQuery,
    handleSearchChange,
    clearSearch,
  };
}

export default useSearch;
