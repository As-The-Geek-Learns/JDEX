import { useState, useEffect, useCallback } from 'react';
import { initDatabase, getAreas, getCategories, getFolders, getStats } from '../db.js';

/**
 * useAppData - Manages core application data state and refresh mechanism
 *
 * WHAT: Provides centralized state for JD hierarchy data (areas, categories, folders)
 *       and a refresh mechanism to reload data after mutations.
 *
 * WHY: Extracted from App.jsx to separate data fetching concerns from UI rendering.
 *      This enables independent testing and reduces cognitive load in the main component.
 *
 * @returns {Object} Core data state and control functions
 */
export function useAppData() {
  // Core data state
  const [isLoading, setIsLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState({});

  // Refresh trigger - increment to force data reload
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Load all core data from the database
   * Called on init and whenever refreshKey changes
   */
  const loadData = useCallback(() => {
    setAreas(getAreas());
    setCategories(getCategories());
    setFolders(getFolders());
    setStats(getStats());
  }, []);

  /**
   * Trigger a data refresh
   * Call this after any data mutation (create, update, delete)
   */
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Initialize database on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      await initDatabase();
      // Only update state if component is still mounted
      if (isMounted) {
        loadData();
        setIsLoading(false);
      }
    }
    init();

    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Reload data whenever refreshKey changes
  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [refreshKey, isLoading, loadData]);

  return {
    // State
    isLoading,
    areas,
    categories,
    folders,
    stats,
    refreshKey,

    // Setters (for direct updates when needed)
    setAreas,
    setCategories,
    setFolders,
    setStats,

    // Actions
    loadData,
    triggerRefresh,
  };
}

export default useAppData;
