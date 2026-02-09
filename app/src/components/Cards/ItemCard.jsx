import React, { useState } from 'react';
import { File, Edit2, Trash2 } from 'lucide-react';
import SensitivityBadge from '../Common/SensitivityBadge.jsx';

function formatFileSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function ItemCard({ item, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const displaySensitivity =
    item.sensitivity === 'inherit' ? item.effective_sensitivity : item.sensitivity;
  const isInherited = item.sensitivity === 'inherit';

  return (
    <div
      className="glass-card p-4 hover-lift cursor-pointer border-l-4 animate-fade-in"
      style={{ borderLeftColor: item.area_color }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <File size={16} className="text-slate-400" />
            <span className="jd-number text-lg text-teal-400">{item.item_number}</span>
            <SensitivityBadge sensitivity={displaySensitivity} isInherited={isInherited} />
            {item.file_type && (
              <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                {item.file_type}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white">{item.name}</h3>
          <p className="text-sm text-slate-400">
            in {item.folder_number} {item.folder_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Edit2 size={16} className="text-slate-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
          >
            <Trash2 size={16} className="text-slate-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 animate-fade-in">
          {item.description && <p className="text-sm text-slate-300 mb-3">{item.description}</p>}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {item.location && (
              <div>
                <span className="text-slate-500">Location:</span>
                <span className="ml-2 text-slate-300">{item.location}</span>
              </div>
            )}
            {item.storage_path && (
              <div className="col-span-2">
                <span className="text-slate-500">Path:</span>
                <span className="ml-2 text-slate-300 font-mono text-xs">{item.storage_path}</span>
              </div>
            )}
            {item.file_size && (
              <div>
                <span className="text-slate-500">Size:</span>
                <span className="ml-2 text-slate-300">{formatFileSize(item.file_size)}</span>
              </div>
            )}
            {item.keywords && (
              <div className="col-span-2">
                <span className="text-slate-500">Keywords:</span>
                <span className="ml-2 text-slate-300">{item.keywords}</span>
              </div>
            )}
          </div>
          {item.notes && (
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-500 text-sm">Notes:</span>
              <p className="text-slate-300 text-sm mt-1">{item.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ItemCard;
