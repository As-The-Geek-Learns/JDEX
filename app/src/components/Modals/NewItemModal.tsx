/**
 * NewItemModal Component
 * ======================
 * Modal for creating new JD items (XX.XX.XXX format).
 *
 * WHAT: Form modal for creating items within folders.
 * WHY: Provides structured input with auto-calculated item numbers.
 */

import type { JSX, FormEvent, ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { File, X, Plus } from 'lucide-react';
import { getNextItemNumber } from '../../db.js';
import type { Folder, Item, ItemSensitivity } from '../../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Folder with joined category info for display in dropdown.
 */
interface FolderWithCategory extends Folder {
  category_number?: number;
  category_name?: string;
}

/**
 * Form data for new item.
 */
interface NewItemFormData {
  folder_id: string;
  name: string;
  description: string;
  file_type: string;
  sensitivity: ItemSensitivity;
  location: string;
  storage_path: string;
  file_size: string;
  keywords: string;
  notes: string;
}

/**
 * Data passed to onSave callback.
 */
export interface NewItemData extends Omit<
  NewItemFormData,
  'folder_id' | 'file_size' | 'sensitivity'
> {
  folder_id: number;
  item_number: string;
  sequence: number;
  file_size: number | null;
  sensitivity: ItemSensitivity;
}

/**
 * Props for NewItemModal component.
 */
export interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderWithCategory[];
  items: Item[];
  onSave: (data: NewItemData) => void;
  preselectedFolder?: Folder | null;
}

// =============================================================================
// Component
// =============================================================================

function NewItemModal({
  isOpen,
  onClose,
  folders,
  items,
  onSave,
  preselectedFolder,
}: NewItemModalProps): JSX.Element | null {
  const [formData, setFormData] = useState<NewItemFormData>({
    folder_id: '',
    name: '',
    description: '',
    file_type: '',
    sensitivity: 'inherit',
    location: '',
    storage_path: '',
    file_size: '',
    keywords: '',
    notes: '',
  });
  const [suggestedNumber, setSuggestedNumber] = useState('');
  const [suggestedSeq, setSuggestedSeq] = useState(1);
  // Track when modal was last opened to force recalculation
  const [openTimestamp, setOpenTimestamp] = useState(0);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setOpenTimestamp(Date.now());
      const folderId = preselectedFolder?.id.toString() || '';
      setFormData({
        folder_id: folderId,
        name: '',
        description: '',
        file_type: '',
        sensitivity: 'inherit',
        location: '',
        storage_path: '',
        file_size: '',
        keywords: '',
        notes: '',
      });
    }
  }, [isOpen, preselectedFolder]);

  // Calculate next item number - runs when modal opens OR folder changes OR items change
  useEffect(() => {
    if (isOpen && formData.folder_id) {
      // Small delay to ensure DB is fully updated
      const timer = setTimeout(() => {
        const next = getNextItemNumber(parseInt(formData.folder_id));
        if (next) {
          setSuggestedNumber(next.item_number);
          setSuggestedSeq(next.sequence);
        }
      }, 10);
      return () => clearTimeout(timer);
    } else if (isOpen) {
      setSuggestedNumber('');
      setSuggestedSeq(1);
    }
  }, [isOpen, formData.folder_id, items.length, openTimestamp]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!formData.folder_id || !formData.name) return;

    onSave({
      ...formData,
      item_number: suggestedNumber,
      sequence: suggestedSeq,
      folder_id: parseInt(formData.folder_id),
      file_size: formData.file_size ? parseInt(formData.file_size) : null,
    });

    // Don't reset form here - let the useEffect handle it when modal reopens
    onClose();
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  // Group folders by category for dropdown
  const groupedFolders = folders.reduce<Record<string, FolderWithCategory[]>>((acc, folder) => {
    const key = `${folder.category_number} ${folder.category_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(folder);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <File className="text-slate-400" />
            New Item (XX.XX.XX)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Folder Container *
              </label>
              <select
                name="folder_id"
                value={formData.folder_id}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                required
              >
                <option value="">Select folder...</option>
                {Object.entries(groupedFolders).map(([catName, fldrs]) => (
                  <optgroup key={catName} label={catName}>
                    {fldrs.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.folder_number} - {folder.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Item Number</label>
              <input
                type="text"
                value={suggestedNumber}
                disabled
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-teal-400 jd-number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Item Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="e.g., README.md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">File Type</label>
              <input
                type="text"
                name="file_type"
                value={formData.file_type}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="e.g., pdf, docx, folder, url"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              rows={2}
              placeholder="What is this item?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sensitivity</label>
              <select
                name="sensitivity"
                value={formData.sensitivity}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="inherit">Inherit from Folder</option>
                <option value="standard">Standard (iCloud)</option>
                <option value="sensitive">Sensitive (ProtonDrive)</option>
                <option value="work">Work (Work OneDrive)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Storage Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Leave blank to inherit from folder"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Storage Path</label>
              <input
                type="text"
                name="storage_path"
                value={formData.storage_path}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Full path to file"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                File Size (bytes)
              </label>
              <input
                type="number"
                name="file_size"
                value={formData.file_size}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Keywords</label>
            <input
              type="text"
              name="keywords"
              value={formData.keywords}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Create Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewItemModal;
