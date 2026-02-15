import type React from 'react';
import { useState, useCallback } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Modal names supported by the hook.
 */
export type ModalName =
  | 'newFolder'
  | 'newItem'
  | 'settings'
  | 'fileOrganizer'
  | 'statsDashboard'
  | 'batchRename';

/**
 * Return type for the useModalState hook.
 */
export interface UseModalStateReturn {
  // Modal states
  showNewFolderModal: boolean;
  showNewItemModal: boolean;
  showSettings: boolean;
  showFileOrganizer: boolean;
  showStatsDashboard: boolean;
  showBatchRename: boolean;

  // Modal setters (for direct control)
  setShowNewFolderModal: (show: boolean) => void;
  setShowNewItemModal: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowFileOrganizer: (show: boolean) => void;
  setShowStatsDashboard: (show: boolean) => void;
  setShowBatchRename: (show: boolean) => void;

  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;

  // Helper functions
  openModal: (modalName: ModalName) => void;
  closeModal: (modalName: ModalName) => void;
  closeAllModals: () => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useModalState - Manages modal visibility states
 *
 * WHAT: Provides centralized state management for all modals in the app,
 *       plus helper functions for opening/closing modals.
 *
 * WHY: Extracted from App.jsx to reduce state clutter and provide
 *      consistent modal management patterns.
 */
export function useModalState(): UseModalStateReturn {
  // Modal visibility states
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFileOrganizer, setShowFileOrganizer] = useState(false);
  const [showStatsDashboard, setShowStatsDashboard] = useState(false);
  const [showBatchRename, setShowBatchRename] = useState(false);

  // Sidebar state (UI visibility, not a modal but related)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /**
   * Open a specific modal by name
   */
  const openModal = useCallback((modalName: ModalName) => {
    switch (modalName) {
      case 'newFolder':
        setShowNewFolderModal(true);
        break;
      case 'newItem':
        setShowNewItemModal(true);
        break;
      case 'settings':
        setShowSettings(true);
        break;
      case 'fileOrganizer':
        setShowFileOrganizer(true);
        break;
      case 'statsDashboard':
        setShowStatsDashboard(true);
        break;
      case 'batchRename':
        setShowBatchRename(true);
        break;
    }
  }, []);

  /**
   * Close a specific modal by name
   */
  const closeModal = useCallback((modalName: ModalName) => {
    switch (modalName) {
      case 'newFolder':
        setShowNewFolderModal(false);
        break;
      case 'newItem':
        setShowNewItemModal(false);
        break;
      case 'settings':
        setShowSettings(false);
        break;
      case 'fileOrganizer':
        setShowFileOrganizer(false);
        break;
      case 'statsDashboard':
        setShowStatsDashboard(false);
        break;
      case 'batchRename':
        setShowBatchRename(false);
        break;
    }
  }, []);

  /**
   * Close all modals at once
   */
  const closeAllModals = useCallback(() => {
    setShowNewFolderModal(false);
    setShowNewItemModal(false);
    setShowSettings(false);
    setShowFileOrganizer(false);
    setShowStatsDashboard(false);
    setShowBatchRename(false);
  }, []);

  /**
   * Toggle sidebar visibility
   */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return {
    // Modal states
    showNewFolderModal,
    showNewItemModal,
    showSettings,
    showFileOrganizer,
    showStatsDashboard,
    showBatchRename,

    // Modal setters (for direct control)
    setShowNewFolderModal,
    setShowNewItemModal,
    setShowSettings,
    setShowFileOrganizer,
    setShowStatsDashboard,
    setShowBatchRename,

    // Sidebar state
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,

    // Helper functions
    openModal,
    closeModal,
    closeAllModals,
  };
}

export default useModalState;
