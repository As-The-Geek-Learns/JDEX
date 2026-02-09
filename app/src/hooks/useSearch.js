import { useState, useEffect, useCallback } from 'react';
import { searchAll } from '../db.js';

/**
 * useSearch - Manages search state and query execution
 *
 * WHAT: Provides search functionality with query state and results.
 *       Automatically executes searchAll when query changes.
 *
 * WHY: Extracted from App.jsx to separate search concerns from main component.
 *      Display filtering (displayFolders/displayItems) remains in App.jsx
 *      since it depends on both search and navigation state.
 *
 * @returns {Object} Search state and control functions
 */
export function useSearch() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ folders: [], items: [] });

  /**
   * Handle search input changes
   */
  const handleSearchChange = useCallback((e) => {
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
      const results = searchAll(searchQuery);
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
