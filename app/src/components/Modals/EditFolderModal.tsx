/**
 * EditFolderModal Component
 * =========================
 * Modal for editing existing JD folders.
 *
 * WHAT: Form modal for updating folder properties.
 * WHY: Provides structured editing while preserving folder number.
 */

import type { JSX, FormEvent, ChangeEvent } from 'react';
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { Folder, Sensitivity } from '../../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Form data for editing folder.
 */
interface EditFolderFormData {
  id: number;
  folder_number: string;
  name: string;
  description: string;
  sensitivity: Sensitivity;
  location: string;
  storage_path: string;
  keywords: string;
  notes: string;
}

/**
 * Props for EditFolderModal component.
 */
export interface EditFolderModalProps {
  folder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditFolderFormData) => void;
}

// =============================================================================
// Component
// =============================================================================

function EditFolderModal({
  folder,
  isOpen,
  onClose,
  onSave,
}: EditFolderModalProps): JSX.Element | null {
  const [formData, setFormData] = useState<Partial<EditFolderFormData>>({});

  useEffect(() => {
    if (folder) {
      setFormData({
        id: folder.id,
        folder_number: folder.folder_number,
        name: folder.name || '',
        description: folder.description || '',
        sensitivity: folder.sensitivity || 'standard',
        location: folder.location || '',
        storage_path: folder.storage_path || '',
        keywords: folder.keywords || '',
        notes: folder.notes || '',
      });
    }
  }, [folder]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSave(formData as EditFolderFormData);
    onClose();
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Edit Folder {folder.folder_number}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Folder Number</label>
            <input
              type="text"
              value={formData.folder_number || ''}
              disabled
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-teal-400 jd-number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sensitivity</label>
              <select
                name="sensitivity"
                value={formData.sensitivity || 'standard'}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              >
                <option value="standard">Standard</option>
                <option value="sensitive">Sensitive</option>
                <option value="work">Work</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Storage Path</label>
            <input
              type="text"
              name="storage_path"
              value={formData.storage_path || ''}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Keywords</label>
            <input
              type="text"
              name="keywords"
              value={formData.keywords || ''}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              rows={2}
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
              <Check size={18} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditFolderModal;
