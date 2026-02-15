/**
 * ItemCard Component
 * ==================
 * Displays an item card with expandable details.
 *
 * WHAT: Item display card with edit/delete actions.
 * WHY: Provides a consistent, visually appealing card UI for items.
 */

import type { JSX, MouseEvent } from 'react';
import { useState, memo } from 'react';
import { File, Edit2, Trash2 } from 'lucide-react';
import SensitivityBadge from '../Common/SensitivityBadge.js';
import type { Item, Sensitivity } from '../../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Extended item type with display properties from joined tables.
 */
export interface ItemWithDisplay extends Item {
  area_color?: string;
  folder_number?: string;
  folder_name?: string;
  effective_sensitivity?: Sensitivity;
}

/**
 * Props for ItemCard component.
 */
export interface ItemCardProps {
  item: ItemWithDisplay;
  onEdit: (item: ItemWithDisplay) => void;
  onDelete: (item: ItemWithDisplay) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format file size in human-readable format.
 * Defined outside component to avoid recreation on each render.
 */
function formatFileSize(bytes: number | undefined): string {
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

// =============================================================================
// Component
// =============================================================================

/**
 * ItemCard component wrapped with React.memo for performance optimization.
 * Only re-renders when item data changes.
 */
const ItemCard = memo(
  function ItemCard({ item, onEdit, onDelete }: ItemCardProps): JSX.Element {
    const [expanded, setExpanded] = useState(false);

    const displaySensitivity: Sensitivity | undefined =
      item.sensitivity === 'inherit' ? item.effective_sensitivity : (item.sensitivity as Sensitivity);
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
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Edit2 size={16} className="text-slate-400" />
            </button>
            <button
              onClick={(e: MouseEvent) => {
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
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if item data changed
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.item_number === nextProps.item.item_number &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.description === nextProps.item.description &&
      prevProps.item.sensitivity === nextProps.item.sensitivity &&
      prevProps.item.effective_sensitivity === nextProps.item.effective_sensitivity &&
      prevProps.item.file_type === nextProps.item.file_type &&
      prevProps.item.file_size === nextProps.item.file_size &&
      prevProps.item.location === nextProps.item.location &&
      prevProps.item.storage_path === nextProps.item.storage_path &&
      prevProps.item.keywords === nextProps.item.keywords &&
      prevProps.item.notes === nextProps.item.notes &&
      prevProps.item.area_color === nextProps.item.area_color &&
      prevProps.item.folder_number === nextProps.item.folder_number &&
      prevProps.item.folder_name === nextProps.item.folder_name
    );
  }
);

export default ItemCard;
