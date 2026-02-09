import React from 'react';
import { Search, Menu } from 'lucide-react';

function MainHeader({ searchQuery, onSearchChange, onToggleSidebar, folderCount, itemCount }) {
  return (
    <header className="glass-card border-b border-slate-700 p-4">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-slate-700 rounded-lg">
          <Menu size={20} />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search folders and items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="text-sm text-slate-400">
          {folderCount} folders, {itemCount} items
        </div>
      </div>
    </header>
  );
}

export default MainHeader;
