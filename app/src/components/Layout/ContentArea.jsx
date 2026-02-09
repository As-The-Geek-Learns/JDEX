import React from 'react';
import { Search, FolderOpen, Plus, ArrowLeft, File } from 'lucide-react';
import { Breadcrumb, QuickStatsOverview } from '../Common/index.js';
import { FolderCard, ItemCard } from '../Cards/index.js';
import DropZone from '../DragDrop/DropZone.jsx';

function ContentArea({
  currentView,
  searchQuery,
  selectedArea,
  selectedCategory,
  selectedFolder,
  breadcrumbPath,
  stats,
  displayFolders,
  displayItems,
  onNavigate,
  onEditFolder,
  onDeleteFolder,
  onEditItem,
  onDeleteItem,
  onNewFolder,
  onNewItem,
  onRefresh,
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Breadcrumb */}
      {breadcrumbPath.length > 0 && !searchQuery && (
        <Breadcrumb path={breadcrumbPath} onNavigate={onNavigate} />
      )}

      {/* Stats */}
      {currentView === 'home' && !searchQuery && <QuickStatsOverview stats={stats} />}

      {/* Current View Title */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">
          {searchQuery
            ? `Search: "${searchQuery}"`
            : currentView === 'folder'
              ? `${selectedFolder?.folder_number} ${selectedFolder?.name}`
              : currentView === 'category'
                ? `${selectedCategory?.number.toString().padStart(2, '0')} ${selectedCategory?.name}`
                : currentView === 'area'
                  ? `${selectedArea?.range_start}-${selectedArea?.range_end} ${selectedArea?.name}`
                  : 'All Folders'}
        </h2>

        {currentView !== 'home' && !searchQuery && (
          <button
            onClick={() => onNavigate('home')}
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft size={14} /> Back to Overview
          </button>
        )}
      </div>

      {/* Folders Section */}
      {(currentView !== 'folder' || searchQuery) && displayFolders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <FolderOpen size={18} className="text-amber-400" />
            Folders ({displayFolders.length})
          </h3>
          <div className="space-y-3">
            {displayFolders.map((folder) => (
              <DropZone key={folder.id} folder={folder} onSuccess={onRefresh}>
                <FolderCard
                  folder={folder}
                  onEdit={onEditFolder}
                  onDelete={onDeleteFolder}
                  onOpen={(f) => onNavigate('folder', f)}
                />
              </DropZone>
            ))}
          </div>
        </div>
      )}

      {/* Items Section */}
      {(currentView === 'folder' || searchQuery) && displayItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <File size={18} className="text-slate-400" />
            Items ({displayItems.length})
          </h3>
          <div className="space-y-3">
            {displayItems.map((item) => (
              <ItemCard key={item.id} item={item} onEdit={onEditItem} onDelete={onDeleteItem} />
            ))}
          </div>
        </div>
      )}

      {/* Empty States - Modern & Engaging */}
      {displayFolders.length === 0 && displayItems.length === 0 && (
        <div className="glass-card p-12 text-center animate-fade-in-up">
          {/* Animated icon container */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div
              className={`
                absolute inset-0 rounded-2xl
                ${
                  searchQuery
                    ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10'
                    : 'bg-gradient-to-br from-amber-500/20 to-amber-600/10'
                }
                flex items-center justify-center
              `}
            >
              {searchQuery ? (
                <Search size={40} className="text-purple-400" />
              ) : (
                <FolderOpen size={40} className="text-amber-400" />
              )}
            </div>
            {/* Decorative rings */}
            <div
              className={`
                absolute inset-0 -m-2 rounded-3xl border-2
                ${searchQuery ? 'border-purple-500/10' : 'border-amber-500/10'}
              `}
            />
            <div
              className={`
                absolute inset-0 -m-4 rounded-3xl border
                ${searchQuery ? 'border-purple-500/5' : 'border-amber-500/5'}
              `}
            />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            {searchQuery ? 'No results found' : 'No folders yet'}
          </h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            {searchQuery
              ? `We couldn't find anything matching "${searchQuery}". Try a different search term.`
              : 'Create your first folder to start organizing your digital life with Johnny Decimal.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onNewFolder}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium
                shadow-[0_2px_10px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
                hover:from-amber-500 hover:to-amber-400 hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)]
                hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <FolderOpen size={18} />
              Create First Folder
            </button>
          )}
        </div>
      )}

      {/* Add Item prompt when in folder view */}
      {currentView === 'folder' && displayItems.length === 0 && !searchQuery && (
        <div className="glass-card p-8 text-center mt-4">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-lg font-semibold text-white mb-2">This folder is empty</h3>
          <p className="text-slate-400 mb-4">Add items to track files in this folder</p>
          <button
            onClick={onNewItem}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      )}
    </div>
  );
}

export default ContentArea;
