import React from 'react';
import {
  FolderOpen,
  Plus,
  HardDrive,
  ChartColumn,
  FileEdit,
  Settings,
  Home,
  Download,
  FileText,
  Upload,
} from 'lucide-react';
import { CategoryTree } from '../Navigation/index.js';

function Sidebar({
  isOpen,
  areas,
  categories,
  currentView,
  searchQuery,
  selectedCategory,
  onNewFolder,
  onNewItem,
  onFileOrganizer,
  onStatsDashboard,
  onBatchRename,
  onSettings,
  onNavigate,
  onExportDatabase,
  onExportJSON,
  onImport,
}) {
  return (
    <aside className={`${isOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
      <div className="w-80 h-screen glass-card border-r border-slate-700/50 flex flex-col">
        {/* Logo - Enhanced with glow */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600
                flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]"
              >
                <span className="text-xl font-bold text-white">JD</span>
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl bg-teal-500/20 blur-md -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                JDex
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-400 font-medium">
                  v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">4-Level Johnny Decimal</p>
            </div>
          </div>
        </div>

        {/* Quick Actions - Modern Button Styles */}
        <div className="p-4 border-b border-slate-700/50 space-y-2">
          <button
            onClick={onNewFolder}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium
              shadow-[0_2px_10px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
              hover:from-amber-500 hover:to-amber-400 hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)]
              hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <FolderOpen size={18} />
            New Folder (XX.XX)
          </button>
          <button
            onClick={onNewItem}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-teal-600 to-teal-500 text-white font-medium
              shadow-[0_2px_10px_rgba(20,184,166,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
              hover:from-teal-500 hover:to-teal-400 hover:shadow-[0_4px_20px_rgba(20,184,166,0.4)]
              hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <Plus size={18} />
            New Item (XX.XX.XX)
          </button>
          <button
            onClick={onFileOrganizer}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium
              shadow-[0_2px_10px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
              hover:from-purple-500 hover:to-purple-400 hover:shadow-[0_4px_20px_rgba(139,92,246,0.4)]
              hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <HardDrive size={18} />
            File Organizer
          </button>
          <button
            onClick={onStatsDashboard}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-purple-600/90 via-fuchsia-600/90 to-teal-600/90 text-white font-medium
              shadow-[0_2px_10px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]
              hover:from-purple-500/90 hover:via-fuchsia-500/90 hover:to-teal-500/90
              hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)]
              hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <ChartColumn size={18} />
            Statistics
          </button>
          <button
            onClick={onBatchRename}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-amber-600/90 to-orange-600/90 text-white font-medium
              shadow-[0_2px_10px_rgba(234,88,12,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]
              hover:from-amber-500/90 hover:to-orange-500/90 hover:shadow-[0_4px_20px_rgba(234,88,12,0.35)]
              hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <FileEdit size={18} />
            Batch Rename
          </button>
          <button
            onClick={onSettings}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              bg-slate-800/50 border border-slate-600/50 text-slate-300 font-medium
              hover:bg-slate-700/50 hover:border-slate-500/50 hover:text-white
              transition-all duration-200"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <button
              onClick={() => onNavigate('home')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'home' && !searchQuery
                  ? 'bg-teal-600/30 text-teal-300'
                  : 'hover:bg-slate-700/50'
              }`}
            >
              <Home size={16} />
              <span className="font-medium">Overview</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-3">
            Areas & Categories
          </div>
          <CategoryTree
            areas={areas}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => onNavigate('category', cat)}
            onSelectArea={(area) => onNavigate('area', area)}
          />
        </div>

        {/* Export/Import */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onExportDatabase}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
            >
              <Download size={14} />
              Backup
            </button>
            <button
              onClick={onExportJSON}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
            >
              <FileText size={14} />
              JSON
            </button>
          </div>
          <label className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm cursor-pointer">
            <Upload size={14} />
            Import Backup
            <input type="file" accept=".sqlite" onChange={onImport} className="hidden" />
          </label>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
