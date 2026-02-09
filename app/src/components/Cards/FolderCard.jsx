import React, { useState } from 'react';
import { FolderOpen, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import SensitivityBadge from '../Common/SensitivityBadge.jsx';

function FolderCard({ folder, onEdit, onDelete, onOpen }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="group relative glass-card p-4 hover-lift cursor-pointer border-l-4 animate-fade-in
        hover:border-l-[5px] transition-all duration-200"
      style={{ borderLeftColor: folder.area_color }}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className="absolute inset-0 rounded-[inherit] bg-gradient-to-r from-white/[0.02] to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0" onClick={() => onOpen(folder)}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10
              flex items-center justify-center group-hover:scale-105 transition-transform"
            >
              <FolderOpen size={16} className="text-amber-400" />
            </div>
            <span
              className="jd-number text-lg bg-gradient-to-r from-teal-400 to-teal-300
              bg-clip-text text-transparent font-bold"
            >
              {folder.folder_number}
            </span>
            <SensitivityBadge sensitivity={folder.sensitivity} />
          </div>
          <h3 className="font-semibold text-white group-hover:text-teal-50 transition-colors truncate">
            {folder.name}
          </h3>
          <p className="text-sm text-slate-400 truncate">
            {folder.category_name} • {folder.area_name}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(folder);
            }}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <Edit2 size={16} className="text-slate-400 hover:text-teal-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder);
            }}
            className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 size={16} className="text-slate-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 animate-fade-in space-y-3">
          {folder.description && <p className="text-sm text-slate-300">{folder.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {folder.location && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs uppercase tracking-wide">Location</span>
                <span className="text-slate-300">{folder.location}</span>
              </div>
            )}
            {folder.storage_path && (
              <div className="col-span-2">
                <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">
                  Path
                </span>
                <code className="text-slate-300 font-mono text-xs bg-slate-800/50 px-2 py-1 rounded block truncate">
                  {folder.storage_path}
                </code>
              </div>
            )}
            {folder.keywords && (
              <div className="col-span-2">
                <span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">
                  Keywords
                </span>
                <div className="flex flex-wrap gap-1">
                  {folder.keywords.split(',').map((keyword, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300"
                    >
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {folder.notes && (
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <span className="text-slate-500 text-xs uppercase tracking-wide">Notes</span>
              <p className="text-slate-300 text-sm mt-1">{folder.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FolderCard;
