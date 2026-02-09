import { useState, useCallback } from 'react';
import { getFolders, getCategories, getItems } from '../db.js';

/**
 * useNavigation - Manages navigation state and breadcrumb trail
 *
 * WHAT: Provides navigation state (currentView, selected area/category/folder)
 *       and the navigateTo function for drilling into the JD hierarchy.
 *
 * WHY: Extracted from App.jsx to separate navigation concerns from data management.
 *      The navigateTo function is complex with breadcrumb building logic.
 *
 * @param {Object} options - Configuration options
 * @param {Array} options.areas - Areas data for breadcrumb building
 * @param {Function} options.setFolders - Setter to update folders state
 * @param {Function} options.setCategories - Setter to update categories state
 * @param {Function} options.setItems - Setter to update items state
 * @param {Function} options.clearSearch - Callback to clear search query
 * @returns {Object} Navigation state and control functions
 */
export function useNavigation({ areas, setFolders, setCategories, setItems, clearSearch }) {
  // Navigation state
  const [currentView, setCurrentView] = useState('home'); // home, area, category, folder
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);

  /**
   * Navigate to a specific view in the JD hierarchy
   * @param {string} type - 'home' | 'area' | 'category' | 'folder'
   * @param {Object|null} data - The data object for the target view
   */
  const navigateTo = useCallback(
    (type, data = null) => {
      // Clear search when navigating
      clearSearch?.();

      // Ensure data is fresh before navigating
      const freshFolders = getFolders();
      const freshCategories = getCategories();
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

        case 'area':
          if (!data) return; // Guard against null data
          setCurrentView('area');
          setSelectedArea(data);
          setSelectedCategory(null);
          setSelectedFolder(null);
          setBreadcrumbPath([
            {
              type: 'area',
              data,
              label: `${data.range_start}-${data.range_end} ${data.name}`,
            },
          ]);
          break;

        case 'category': {
          if (!data) return; // Guard against null data
          setCurrentView('category');
          setSelectedCategory(data);
          setSelectedFolder(null);
          // Find area for breadcrumb
          const area = areas.find((a) => a.id === data.area_id);
          setBreadcrumbPath([
            {
              type: 'area',
              data: area,
              label: `${area?.range_start}-${area?.range_end} ${area?.name}`,
            },
            {
              type: 'category',
              data,
              label: `${data.number?.toString().padStart(2, '0') ?? '??'} ${data.name ?? ''}`,
            },
          ]);
          break;
        }

        case 'folder': {
          if (!data) return; // Guard against null data
          setCurrentView('folder');
          setSelectedFolder(data);
          // Refresh items for this folder
          setItems(getItems(data.id));
          // Build full breadcrumb using fresh categories data
          const folder = data;
          const cat = freshCategories.find((c) => c.id === folder.category_id);
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
              data: folder,
              label: `${folder.folder_number ?? ''} ${folder.name ?? ''}`,
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
