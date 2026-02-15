import { useState, useCallback } from 'react';
import { getFolders, getCategories, getItems } from '../db.js';
import type { Area, Category, Folder, Item } from '../types/index.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Navigation view types in the JD hierarchy.
 */
export type ViewType = 'home' | 'area' | 'category' | 'folder' | 'search';

/**
 * Breadcrumb item for navigation trail.
 */
export interface BreadcrumbItem {
  type: ViewType;
  data: Area | Category | Folder | null | undefined;
  label: string;
}

/**
 * Options for the useNavigation hook.
 */
export interface UseNavigationOptions {
  areas: Area[];
  setFolders: (folders: Folder[]) => void;
  setCategories: (categories: Category[]) => void;
  setItems: (items: Item[]) => void;
  clearSearch?: () => void;
}

/**
 * Return type for the useNavigation hook.
 */
export interface UseNavigationReturn {
  // State
  currentView: ViewType;
  selectedArea: Area | null;
  selectedCategory: Category | null;
  selectedFolder: Folder | null;
  breadcrumbPath: BreadcrumbItem[];

  // Actions
  navigateTo: (type: ViewType, data?: Area | Category | Folder | null) => void;
  goHome: () => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useNavigation - Manages navigation state and breadcrumb trail
 *
 * WHAT: Provides navigation state (currentView, selected area/category/folder)
 *       and the navigateTo function for drilling into the JD hierarchy.
 *
 * WHY: Extracted from App.jsx to separate navigation concerns from data management.
 *      The navigateTo function is complex with breadcrumb building logic.
 */
export function useNavigation({
  areas,
  setFolders,
  setCategories,
  setItems,
  clearSearch,
}: UseNavigationOptions): UseNavigationReturn {
  // Navigation state
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([]);

  /**
   * Navigate to a specific view in the JD hierarchy
   */
  const navigateTo = useCallback(
    (type: ViewType, data: Area | Category | Folder | null = null) => {
      // Clear search when navigating
      clearSearch?.();

      // Ensure data is fresh before navigating
      const freshFolders = getFolders() as Folder[];
      const freshCategories = getCategories() as Category[];
      setFolders(freshFolders);
      setCategories(freshCategories);

      switch (type) {
        case 'home':
          setCurrentView('home');
          setSelectedArea(null);
          setSelectedCategory(null);
          setSelectedFolder(null);
          setBreadcrumbPath([]);
          break;

        case 'area': {
          if (!data) return; // Guard against null data
          const areaData = data as Area;
          setCurrentView('area');
          setSelectedArea(areaData);
          setSelectedCategory(null);
          setSelectedFolder(null);
          setBreadcrumbPath([
            {
              type: 'area',
              data: areaData,
              label: `${areaData.range_start}-${areaData.range_end} ${areaData.name}`,
            },
          ]);
          break;
        }

        case 'category': {
          if (!data) return; // Guard against null data
          const categoryData = data as Category;
          setCurrentView('category');
          setSelectedCategory(categoryData);
          setSelectedFolder(null);
          // Find area for breadcrumb
          const area = areas.find((a) => a.id === categoryData.area_id);
          setBreadcrumbPath([
            {
              type: 'area',
              data: area,
              label: `${area?.range_start}-${area?.range_end} ${area?.name}`,
            },
            {
              type: 'category',
              data: categoryData,
              label: `${categoryData.number?.toString().padStart(2, '0') ?? '??'} ${categoryData.name ?? ''}`,
            },
          ]);
          break;
        }

        case 'folder': {
          if (!data) return; // Guard against null data
          const folderData = data as Folder;
          setCurrentView('folder');
          setSelectedFolder(folderData);
          // Refresh items for this folder
          setItems(getItems(folderData.id) as Item[]);
          // Build full breadcrumb using fresh categories data
          const cat = freshCategories.find((c) => c.id === folderData.category_id);
          const ar = areas.find((a) => a.id === cat?.area_id);
          setBreadcrumbPath([
            {
              type: 'area',
              data: ar,
              label: `${ar?.range_start}-${ar?.range_end} ${ar?.name}`,
            },
            {
              type: 'category',
              data: cat,
              label: `${cat?.number?.toString().padStart(2, '0') ?? '??'} ${cat?.name ?? ''}`,
            },
            {
              type: 'folder',
              data: folderData,
              label: `${folderData.folder_number ?? ''} ${folderData.name ?? ''}`,
            },
          ]);
          break;
        }
      }
    },
    [areas, setFolders, setCategories, setItems, clearSearch]
  );

  /**
   * Navigate back to home view
   */
  const goHome = useCallback(() => {
    navigateTo('home');
  }, [navigateTo]);

  return {
    // State
    currentView,
    selectedArea,
    selectedCategory,
    selectedFolder,
    breadcrumbPath,

    // Actions
    navigateTo,
    goHome,
  };
}

export default useNavigation;
