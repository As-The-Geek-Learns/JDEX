/**
 * JDex App Component
 * ==================
 * Root application component orchestrating hooks, state, and UI.
 */

import type { JSX, ChangeEvent } from 'react';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useAppData } from './hooks/useAppData.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useSearch } from './hooks/useSearch.js';
import { useFolderCRUD } from './hooks/useFolderCRUD.js';
import { useItemCRUD } from './hooks/useItemCRUD.js';
import { useModalState } from './hooks/useModalState.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import type { ModalName } from './hooks/useModalState.js';
import FileOrganizer from './components/FileOrganizer/FileOrganizer.jsx';
import StatsDashboard from './components/Stats/StatsDashboard.jsx';
import BatchRenameModal from './components/BatchRename/BatchRenameModal.jsx';
import CommandPalette from './components/CommandPalette/CommandPalette.js';
import { Sidebar, MainHeader, ContentArea } from './components/Layout/index.js';
import {
  NewFolderModal,
  NewItemModal,
  EditFolderModal,
  EditItemModal,
  SettingsModal,
} from './components/Modals/index.js';
import { LicenseProvider } from './context/LicenseContext.js';
import { DragDropProvider } from './context/DragDropContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { UndoProvider, useUndo } from './context/UndoContext.js';
import { exportDatabase, exportToJSON, importDatabase } from './db.js';
import type { Category } from './types/index.js';
import type { FolderWithDisplay, ItemWithDisplay } from './components/Cards/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Extended category type with joined area name for display.
 */
interface CategoryWithArea extends Category {
  area_name?: string;
}

// =============================================================================
// Component
// =============================================================================

export default function App(): JSX.Element {
  // Core data from useAppData hook
  const {
    isLoading,
    areas,
    categories,
    folders,
    stats,
    setFolders,
    setCategories,
    triggerRefresh,
  } = useAppData();

  // Items state - managed separately as it depends on selectedFolder
  const [items, setItems] = useState<ItemWithDisplay[]>([]);

  // Search state from useSearch hook
  const { searchQuery, searchResults, setSearchQuery, clearSearch } = useSearch();

  // Navigation from useNavigation hook
  const {
    currentView,
    selectedArea,
    selectedCategory,
    selectedFolder,
    breadcrumbPath,
    navigateTo,
  } = useNavigation({
    areas,
    setFolders,
    setCategories,
    setItems,
    clearSearch,
  });

  // Folder CRUD from useFolderCRUD hook
  const {
    editingFolder,
    setEditingFolder,
    handleCreateFolder,
    handleUpdateFolder,
    handleDeleteFolder,
  } = useFolderCRUD({
    triggerRefresh,
    selectedFolder,
    selectedCategory,
    navigateTo,
  });

  // Item CRUD from useItemCRUD hook
  const { editingItem, setEditingItem, handleCreateItem, handleUpdateItem, handleDeleteItem } =
    useItemCRUD({
      triggerRefresh,
      selectedFolder,
      setItems,
    });

  // Modal states from useModalState hook
  const {
    showNewFolderModal,
    showNewItemModal,
    showSettings,
    showFileOrganizer,
    showStatsDashboard,
    showBatchRename,
    setShowNewFolderModal,
    setShowNewItemModal,
    setShowSettings,
    setShowFileOrganizer,
    setShowStatsDashboard,
    setShowBatchRename,
    sidebarOpen,
    setSidebarOpen,
  } = useModalState();

  // Ref for search input (used by Cmd+K shortcut)
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Command palette state
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Undo/redo context
  const { undo, redo } = useUndo();

  // Keyboard shortcut handlers
  const openModal = useCallback(
    (modalName: ModalName): void => {
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
    },
    [
      setShowNewFolderModal,
      setShowNewItemModal,
      setShowSettings,
      setShowFileOrganizer,
      setShowStatsDashboard,
      setShowBatchRename,
    ]
  );

  const closeAllModals = useCallback((): void => {
    setShowNewFolderModal(false);
    setShowNewItemModal(false);
    setShowSettings(false);
    setShowFileOrganizer(false);
    setShowStatsDashboard(false);
    setShowBatchRename(false);
    setShowCommandPalette(false);
    setEditingFolder(null);
    setEditingItem(null);
  }, [
    setShowNewFolderModal,
    setShowNewItemModal,
    setShowSettings,
    setShowFileOrganizer,
    setShowStatsDashboard,
    setShowBatchRename,
    setEditingFolder,
    setEditingItem,
  ]);

  const toggleSidebar = useCallback((): void => {
    setSidebarOpen((prev) => !prev);
  }, [setSidebarOpen]);

  const focusSearch = useCallback((): void => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const openCommandPalette = useCallback((): void => {
    setShowCommandPalette(true);
  }, []);

  const closeCommandPalette = useCallback((): void => {
    setShowCommandPalette(false);
  }, []);

  // Register keyboard shortcuts
  useKeyboardShortcuts(
    { openModal, closeAllModals, toggleSidebar, focusSearch, openCommandPalette, undo, redo },
    {
      showNewFolderModal,
      showNewItemModal,
      showSettings,
      showFileOrganizer,
      showStatsDashboard,
      showBatchRename,
      showCommandPalette,
    }
  );

  const handleImport = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (file) {
      await importDatabase(file);
      triggerRefresh();
      navigateTo('home');
    }
  };

  // Get display data based on current view - using useMemo for proper recalculation
  const displayFolders = useMemo((): FolderWithDisplay[] => {
    if (searchQuery.trim()) return searchResults.folders as FolderWithDisplay[];
    if (selectedCategory)
      return (folders as FolderWithDisplay[]).filter((f) => f.category_id === selectedCategory.id);
    if (selectedArea) {
      const areaCatIds = (categories as CategoryWithArea[])
        .filter((c) => c.area_id === selectedArea.id)
        .map((c) => c.id);
      return (folders as FolderWithDisplay[]).filter((f) => areaCatIds.includes(f.category_id));
    }
    return folders as FolderWithDisplay[];
  }, [searchQuery, searchResults.folders, selectedCategory, selectedArea, folders, categories]);

  const displayItems = useMemo((): ItemWithDisplay[] => {
    if (searchQuery.trim()) return searchResults.items as ItemWithDisplay[];
    if (selectedFolder) return items;
    return [];
  }, [searchQuery, searchResults.items, selectedFolder, items]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="text-center">
          {/* Animated logo */}
          <div className="relative mb-6">
            <div
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700
              flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.3)]
              animate-pulse"
            >
              <span className="text-3xl font-bold text-white">JD</span>
            </div>
            {/* Glow ring */}
            <div
              className="absolute inset-0 -m-2 rounded-3xl border-2 border-teal-500/20 animate-ping"
              style={{ animationDuration: '2s' }}
            />
          </div>

          {/* Loading text with shimmer */}
          <div
            className="text-xl font-semibold text-transparent bg-clip-text
            bg-gradient-to-r from-teal-400 via-white to-teal-400
            animate-[shimmer_2s_linear_infinite] bg-[length:200%_auto]"
          >
            Loading JDex v2.0
          </div>
          <div className="text-sm text-slate-500 mt-2">Preparing your workspace...</div>

          {/* Loading bar */}
          <div className="w-48 h-1 mx-auto mt-4 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full
              animate-[shimmer_1s_ease-in-out_infinite]"
              style={{ width: '60%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <UndoProvider onRefresh={triggerRefresh}>
        <LicenseProvider>
          <DragDropProvider>
            <div className="min-h-screen flex">
              <Sidebar
                isOpen={sidebarOpen}
                areas={areas}
                categories={categories as CategoryWithArea[]}
                currentView={currentView}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                onNewFolder={() => setShowNewFolderModal(true)}
                onNewItem={() => setShowNewItemModal(true)}
                onFileOrganizer={() => setShowFileOrganizer(true)}
                onStatsDashboard={() => setShowStatsDashboard(true)}
                onBatchRename={() => setShowBatchRename(true)}
                onSettings={() => setShowSettings(true)}
                onNavigate={navigateTo}
                onExportDatabase={exportDatabase}
                onExportJSON={exportToJSON}
                onImport={handleImport}
              />

              {/* Main Content */}
              <main className="flex-1 flex flex-col min-h-screen">
                <MainHeader
                  ref={searchInputRef}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onToggleSidebar={toggleSidebar}
                  folderCount={displayFolders.length}
                  itemCount={displayItems.length}
                />
                <ContentArea
                  currentView={currentView}
                  searchQuery={searchQuery}
                  selectedArea={selectedArea}
                  selectedCategory={selectedCategory}
                  selectedFolder={selectedFolder}
                  breadcrumbPath={breadcrumbPath}
                  stats={stats}
                  displayFolders={displayFolders}
                  displayItems={displayItems}
                  onNavigate={navigateTo}
                  onEditFolder={setEditingFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onEditItem={setEditingItem}
                  onDeleteItem={handleDeleteItem}
                  onNewFolder={() => setShowNewFolderModal(true)}
                  onNewItem={() => setShowNewItemModal(true)}
                  onRefresh={() => triggerRefresh()}
                />
              </main>

              {/* Modals */}
              <NewFolderModal
                isOpen={showNewFolderModal}
                onClose={() => setShowNewFolderModal(false)}
                categories={categories as CategoryWithArea[]}
                folders={folders}
                onSave={handleCreateFolder}
                preselectedCategory={selectedCategory}
              />

              <NewItemModal
                isOpen={showNewItemModal}
                onClose={() => setShowNewItemModal(false)}
                folders={folders as FolderWithDisplay[]}
                items={items}
                onSave={handleCreateItem}
                preselectedFolder={selectedFolder}
              />

              <EditFolderModal
                folder={editingFolder}
                isOpen={!!editingFolder}
                onClose={() => setEditingFolder(null)}
                onSave={handleUpdateFolder}
              />

              <EditItemModal
                item={editingItem}
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleUpdateItem}
              />

              <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                areas={areas}
                categories={categories as CategoryWithArea[]}
                onDataChange={triggerRefresh}
              />

              {/* File Organizer (full-screen overlay) */}
              {showFileOrganizer && <FileOrganizer onClose={() => setShowFileOrganizer(false)} />}

              {/* Statistics Dashboard (premium feature) */}
              {showStatsDashboard && (
                <StatsDashboard onClose={() => setShowStatsDashboard(false)} />
              )}

              {/* Batch Rename Modal (premium feature) */}
              {showBatchRename && <BatchRenameModal onClose={() => setShowBatchRename(false)} />}

              {/* Command Palette */}
              <CommandPalette
                isOpen={showCommandPalette}
                onClose={closeCommandPalette}
                handlers={{
                  openModal,
                  navigateTo,
                  focusSearch,
                  toggleSidebar,
                  exportDatabase,
                  exportJSON: exportToJSON,
                }}
              />
            </div>
          </DragDropProvider>
        </LicenseProvider>
      </UndoProvider>
    </ThemeProvider>
  );
}
