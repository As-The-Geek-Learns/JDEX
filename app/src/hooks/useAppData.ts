import { useState, useEffect, useCallback } from 'react';
import { initDatabase, getAreas, getCategories, getFolders, getStats } from '../db.js';
import type { Area, Category, Folder } from '../types/index.js';
import type { DatabaseStats } from '../db/repositories/statistics.js';

// Re-export for consumers
export type { DatabaseStats };

/**
 * Return type for the useAppData hook.
 */
export interface UseAppDataReturn {
  // State
  isLoading: boolean;
  areas: Area[];
  categories: Category[];
  folders: Folder[];
  stats: DatabaseStats;
  refreshKey: number;

  // Setters (for direct updates when needed)
  setAreas: (areas: Area[]) => void;
  setCategories: (categories: Category[]) => void;
  setFolders: (folders: Folder[]) => void;
  setStats: (stats: DatabaseStats) => void;

  // Actions
  loadData: () => void;
  triggerRefresh: () => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useAppData - Manages core application data state and refresh mechanism
 *
 * WHAT: Provides centralized state for JD hierarchy data (areas, categories, folders)
 *       and a refresh mechanism to reload data after mutations.
 *
 * WHY: Extracted from App.jsx to separate data fetching concerns from UI rendering.
 *      This enables independent testing and reduces cognitive load in the main component.
 */
export function useAppData(): UseAppDataReturn {
  // Core data state
  const [isLoading, setIsLoading] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<DatabaseStats>({
    totalFolders: 0,
    totalItems: 0,
    totalCategories: 0,
    sensitiveFolders: 0,
    workFolders: 0,
    standardFolders: 0,
    inheritItems: 0,
    sensitiveItems: 0,
    workItems: 0,
    standardItems: 0,
  });

  // Refresh trigger - increment to force data reload
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Load all core data from the database
   * Called on init and whenever refreshKey changes
   */
  const loadData = useCallback(() => {
    setAreas(getAreas() as Area[]);
    setCategories(getCategories() as Category[]);
    setFolders(getFolders() as Folder[]);
    setStats(getStats() as DatabaseStats);
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

    async function init(): Promise<void> {
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
