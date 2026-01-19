import React from 'react';
import { ArrowRight, AlertTriangle, Check, X } from 'lucide-react';

/**
 * RenamePreview Component
 * ========================
 * Displays a preview table of all file renames with conflict detection.
 */
export default function RenamePreview({ preview, maxDisplay = 50 }) {
  if (!preview || preview.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        Select files and configure options to see preview
      </div>
    );
  }

  const displayItems = preview.slice(0, maxDisplay);
  const hasMore = preview.length > maxDisplay;
  
  const stats = {
    willChange: preview.filter(p => p.willChange).length,
    conflicts: preview.filter(p => p.conflict).length,
    unchanged: preview.filter(p => !p.willChange).length,
  };

  return (
    <div className="space-y-3">
      {/* Stats Summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-slate-400">
          <span className="text-green-400 font-medium">{stats.willChange}</span> will change
        </span>
        {stats.conflicts > 0 && (
          <span className="text-amber-400">
            <AlertTriangle size={14} className="inline mr-1" />
            {stats.conflicts} conflicts
          </span>
        )}
        {stats.unchanged > 0 && (
          <span className="text-slate-500">
            {stats.unchanged} unchanged
          </span>
        )}
      </div>

      {/* Preview Table */}
      <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-slate-300 font-medium">Original</th>
                <th className="px-2 py-2 w-8"></th>
                <th className="text-left px-3 py-2 text-slate-300 font-medium">New Name</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, index) => (
                <tr 
                  key={index}
                  className={`
                    border-t border-slate-700/50
                    ${item.conflict ? 'bg-amber-500/10' : ''}
                    ${!item.willChange ? 'opacity-50' : ''}
                  `}
                >
                  <td className="px-3 py-2 text-slate-400 truncate max-w-[200px]" title={item.original}>
                    {item.original}
                  </td>
                  <td className="px-2 py-2 text-slate-500">
                    <ArrowRight size={14} />
                  </td>
                  <td className={`px-3 py-2 truncate max-w-[200px] ${
                    item.willChange ? 'text-teal-400' : 'text-slate-500'
                  }`} title={item.newName}>
                    {item.newName}
                  </td>
                  <td className="px-3 py-2">
                    {item.conflict === 'duplicate' && (
                      <span className="text-amber-400" title="Duplicate name in batch">
                        <AlertTriangle size={16} />
                      </span>
                    )}
                    {item.conflict === 'exists' && (
                      <span className="text-amber-400" title="File already exists">
                        <X size={16} />
                      </span>
                    )}
                    {!item.conflict && item.willChange && (
                      <span className="text-green-400">
                        <Check size={16} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="px-3 py-2 bg-slate-700/30 text-center text-sm text-slate-400">
            ... and {preview.length - maxDisplay} more files
          </div>
        )}
      </div>
    </div>
  );
}
