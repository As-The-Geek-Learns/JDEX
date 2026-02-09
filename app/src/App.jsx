import React, { useState, useEffect, useCallback } from 'react';
import { useAppData } from './hooks/useAppData.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useSearch } from './hooks/useSearch.js';
import { useFolderCRUD } from './hooks/useFolderCRUD.js';
import { useItemCRUD } from './hooks/useItemCRUD.js';
import { useModalState } from './hooks/useModalState.js';
import {
  FolderTree,
  Database,
  Shield,
  Cloud,
  Edit2,
  Trash2,
  X,
  Check,
  CircleAlert,
  Layers,
  Table,
  Terminal,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import CloudDriveSettings from './components/Settings/CloudDriveSettings.jsx';
import LicenseSettings from './components/Settings/LicenseSettings.jsx';
import FeedbackSettings from './components/Settings/FeedbackSettings.jsx';
import FileOrganizer from './components/FileOrganizer/FileOrganizer.jsx';
import StatsDashboard from './components/Stats/StatsDashboard.jsx';
import BatchRenameModal from './components/BatchRename/BatchRenameModal.jsx';
import { Sidebar, MainHeader, ContentArea } from './components/Layout/index.js';
import { LicenseProvider } from './context/LicenseContext.jsx';
import { DragDropProvider } from './context/DragDropContext.jsx';
import {
  getNextFolderNumber,
  getNextItemNumber,
  exportDatabase,
  exportToJSON,
  importDatabase,
  createArea,
  updateArea,
  deleteArea,
  createCategory,
  updateCategory,
  deleteCategory,
  executeSQL,
  getTableData,
  resetDatabase,
} from './db.js';

// New Folder Modal
function NewFolderModal({ isOpen, onClose, categories, folders, onSave, preselectedCategory }) {
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    sensitivity: 'standard',
    location: '',
    storage_path: '',
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
      const categoryId = preselectedCategory?.id.toString() || '';
      setFormData({
        category_id: categoryId,
        name: '',
        description: '',
        sensitivity: 'standard',
        location: '',
        storage_path: '',
        keywords: '',
        notes: '',
      });
    }
  }, [isOpen, preselectedCategory]);

  // Calculate next folder number - runs when modal opens OR category changes OR folders change
  useEffect(() => {
    if (isOpen && formData.category_id) {
      // Small delay to ensure DB is fully updated
      const timer = setTimeout(() => {
        const next = getNextFolderNumber(parseInt(formData.category_id));
        if (next) {
          setSuggestedNumber(next.folder_number);
          setSuggestedSeq(next.sequence);
        }
      }, 10);
      return () => clearTimeout(timer);
    } else if (isOpen) {
      setSuggestedNumber('');
      setSuggestedSeq(1);
    }
  }, [isOpen, formData.category_id, folders.length, openTimestamp]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.name) return;

    onSave({
      ...formData,
      folder_number: suggestedNumber,
      sequence: suggestedSeq,
      category_id: parseInt(formData.category_id),
    });

    // Don't reset form here - let the useEffect handle it when modal reopens
    onClose();
  };

  if (!isOpen) return null;

  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.area_name]) acc[cat.area_name] = [];
    acc[cat.area_name].push(cat);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="text-amber-400" />
            New Folder (XX.XX)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                required
              >
                <option value="">Select category...</option>
                {Object.entries(groupedCategories).map(([areaName, cats]) => (
                  <optgroup key={areaName} label={areaName}>
                    {cats.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.number.toString().padStart(2, '0')} - {cat.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Folder Number</label>
              <input
                type="text"
                value={suggestedNumber}
                disabled
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-teal-400 jd-number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Folder Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="e.g., Script Documentation"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              rows={2}
              placeholder="What belongs in this folder?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sensitivity</label>
              <select
                value={formData.sensitivity}
                onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="standard">Standard (iCloud)</option>
                <option value="sensitive">Sensitive (ProtonDrive)</option>
                <option value="work">Work (Work OneDrive)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Items can inherit this or override</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Storage Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="e.g., iCloud, Google Drive"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Storage Path</label>
            <input
              type="text"
              value={formData.storage_path}
              onChange={(e) => setFormData({ ...formData, storage_path: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="Full path to folder"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Keywords (comma separated)
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// New Item Modal
function NewItemModal({ isOpen, onClose, folders, items, onSave, preselectedFolder }) {
  const [formData, setFormData] = useState({
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

  const handleSubmit = (e) => {
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

  if (!isOpen) return null;

  // Group folders by category for dropdown
  const groupedFolders = folders.reduce((acc, folder) => {
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
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
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
                value={formData.folder_id}
                onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="e.g., README.md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">File Type</label>
              <input
                type="text"
                value={formData.file_type}
                onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="e.g., pdf, docx, folder, url"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              rows={2}
              placeholder="What is this item?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sensitivity</label>
              <select
                value={formData.sensitivity}
                onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value })}
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
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                value={formData.storage_path}
                onChange={(e) => setFormData({ ...formData, storage_path: e.target.value })}
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
                value={formData.file_size}
                onChange={(e) => setFormData({ ...formData, file_size: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Keywords</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

// Edit Folder Modal
function EditFolderModal({ folder, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({});

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Edit Folder {folder.folder_number}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
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
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sensitivity</label>
              <select
                value={formData.sensitivity || 'standard'}
                onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value })}
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
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Storage Path</label>
            <input
              type="text"
              value={formData.storage_path || ''}
              onChange={(e) => setFormData({ ...formData, storage_path: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Keywords</label>
            <input
              type="text"
              value={formData.keywords || ''}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

// Edit Item Modal
function EditItemModal({ item, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (item) {
      setFormData({
        id: item.id,
        item_number: item.item_number,
        name: item.name || '',
        description: item.description || '',
        file_type: item.file_type || '',
        sensitivity: item.sensitivity || 'inherit',
        location: item.location || '',
        storage_path: item.storage_path || '',
        file_size: item.file_size || '',
        keywords: item.keywords || '',
        notes: item.notes || '',
      });
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      file_size: formData.file_size ? parseInt(formData.file_size) : null,
    });
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Edit Item {item.item_number}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Item Number</label>
              <input
                type="text"
                value={formData.item_number || ''}
                disabled
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-teal-400 jd-number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">File Type</label>
              <input
                type="text"
                value={formData.file_type || ''}
                onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sensitivity</label>
              <select
                value={formData.sensitivity || 'inherit'}
                onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              >
                <option value="inherit">Inherit from Folder</option>
                <option value="standard">Standard</option>
                <option value="sensitive">Sensitive</option>
                <option value="work">Work</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Storage Path</label>
              <input
                type="text"
                value={formData.storage_path || ''}
                onChange={(e) => setFormData({ ...formData, storage_path: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">File Size</label>
              <input
                type="number"
                value={formData.file_size || ''}
                onChange={(e) => setFormData({ ...formData, file_size: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Keywords</label>
            <input
              type="text"
              value={formData.keywords || ''}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

// Settings Modal (abbreviated - keeping core functionality)
function SettingsModal({ isOpen, onClose, areas, categories, onDataChange }) {
  const [activeTab, setActiveTab] = useState('areas');
  const [editingArea, setEditingArea] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newArea, setNewArea] = useState({
    range_start: '',
    range_end: '',
    name: '',
    description: '',
    color: '#64748b',
  });
  const [newCategory, setNewCategory] = useState({
    number: '',
    area_id: '',
    name: '',
    description: '',
  });
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [error, setError] = useState('');

  const tables = ['areas', 'categories', 'folders', 'items', 'storage_locations', 'activity_log'];

  const handleCreateArea = () => {
    try {
      if (!newArea.range_start || !newArea.range_end || !newArea.name) {
        setError('Range start, end, and name are required');
        return;
      }
      createArea({
        range_start: parseInt(newArea.range_start),
        range_end: parseInt(newArea.range_end),
        name: newArea.name,
        description: newArea.description,
        color: newArea.color,
      });
      setNewArea({ range_start: '', range_end: '', name: '', description: '', color: '#64748b' });
      setError('');
      onDataChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateArea = (area) => {
    try {
      updateArea(area.id, area);
      setEditingArea(null);
      setError('');
      onDataChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteArea = (id) => {
    if (!confirm('Delete this area? This cannot be undone.')) return;
    try {
      deleteArea(id);
      setError('');
      onDataChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateCategory = () => {
    try {
      if (!newCategory.number || !newCategory.area_id || !newCategory.name) {
        setError('Number, area, and name are required');
        return;
      }
      createCategory({
        number: parseInt(newCategory.number),
        area_id: parseInt(newCategory.area_id),
        name: newCategory.name,
        description: newCategory.description,
      });
      setNewCategory({ number: '', area_id: '', name: '', description: '' });
      setError('');
      onDataChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateCategory = (cat) => {
    try {
      updateCategory(cat.id, cat);
      setEditingCategory(null);
      setError('');
      onDataChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteCategory = (id) => {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    try {
      deleteCategory(id);
      setError('');
      onDataChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleExecuteSQL = () => {
    if (!sqlQuery.trim()) return;
    if (
      !confirm(
        'WARNING: You are about to execute raw SQL. This can modify or delete data.\n\nAre you sure you want to proceed?'
      )
    ) {
      return;
    }
    const result = executeSQL(sqlQuery);
    setSqlResult(result);
    if (result.success) onDataChange();
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    const data = getTableData(tableName);
    setTableData(data);
  };

  const handleResetDatabase = () => {
    if (!confirm('WARNING: This will delete ALL data and reset to defaults. Are you sure?')) return;
    if (!confirm('This action CANNOT be undone. Type "RESET" in the next prompt to confirm.'))
      return;
    const confirmation = prompt('Type RESET to confirm:');
    if (confirmation === 'RESET') {
      resetDatabase();
      onDataChange();
      alert('Database has been reset to defaults.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-5xl h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings size={24} />
            System Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'areas' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Layers size={16} className="inline mr-2" />
            Areas
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'categories' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            <FolderTree size={16} className="inline mr-2" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'cloud' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Cloud size={16} className="inline mr-2" />
            Cloud Storage
          </button>
          <button
            onClick={() => setActiveTab('license')}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'license' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Shield size={16} className="inline mr-2" />
            License
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'database' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Database size={16} className="inline mr-2" />
            Database
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'feedback' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            <MessageSquare size={16} className="inline mr-2" />
            Feedback
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
            <CircleAlert size={16} />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'areas' && (
            <div className="space-y-6">
              <div className="glass-card p-4">
                <h3 className="font-semibold text-white mb-4">Add New Area</h3>
                <div className="grid grid-cols-6 gap-3">
                  <input
                    type="number"
                    placeholder="Start"
                    value={newArea.range_start}
                    onChange={(e) => setNewArea({ ...newArea, range_start: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="number"
                    placeholder="End"
                    value={newArea.range_end}
                    onChange={(e) => setNewArea({ ...newArea, range_end: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={newArea.name}
                    onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newArea.description}
                    onChange={(e) => setNewArea({ ...newArea, description: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="color"
                    value={newArea.color}
                    onChange={(e) => setNewArea({ ...newArea, color: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded h-10 w-full cursor-pointer"
                  />
                  <button
                    onClick={handleCreateArea}
                    className="bg-teal-600 text-white rounded px-4 py-2 hover:bg-teal-500 flex items-center justify-center gap-1"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {areas.map((area) => (
                  <div key={area.id} className="glass-card p-4 flex items-center gap-4">
                    {editingArea?.id === area.id ? (
                      <>
                        <input
                          type="number"
                          value={editingArea.range_start}
                          onChange={(e) =>
                            setEditingArea({
                              ...editingArea,
                              range_start: parseInt(e.target.value),
                            })
                          }
                          className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        />
                        <span className="text-slate-500">-</span>
                        <input
                          type="number"
                          value={editingArea.range_end}
                          onChange={(e) =>
                            setEditingArea({ ...editingArea, range_end: parseInt(e.target.value) })
                          }
                          className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        />
                        <input
                          type="text"
                          value={editingArea.name}
                          onChange={(e) => setEditingArea({ ...editingArea, name: e.target.value })}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        />
                        <input
                          type="color"
                          value={editingArea.color}
                          onChange={(e) =>
                            setEditingArea({ ...editingArea, color: e.target.value })
                          }
                          className="w-10 h-8 bg-slate-800 border border-slate-600 rounded cursor-pointer"
                        />
                        <button
                          onClick={() => handleUpdateArea(editingArea)}
                          className="p-2 bg-teal-600 rounded hover:bg-teal-500"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingArea(null)}
                          className="p-2 bg-slate-600 rounded hover:bg-slate-500"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: area.color }}
                        ></div>
                        <span className="jd-number text-teal-400 w-16">
                          {area.range_start}-{area.range_end}
                        </span>
                        <span className="font-medium text-white flex-1">{area.name}</span>
                        <span className="text-slate-400 flex-1">{area.description}</span>
                        <button
                          onClick={() => setEditingArea({ ...area })}
                          className="p-2 hover:bg-slate-700 rounded"
                        >
                          <Edit2 size={16} className="text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteArea(area.id)}
                          className="p-2 hover:bg-red-900/50 rounded"
                        >
                          <Trash2 size={16} className="text-slate-400 hover:text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="glass-card p-4">
                <h3 className="font-semibold text-white mb-4">Add New Category</h3>
                <div className="grid grid-cols-5 gap-3">
                  <input
                    type="number"
                    placeholder="Number"
                    value={newCategory.number}
                    onChange={(e) => setNewCategory({ ...newCategory, number: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <select
                    value={newCategory.area_id}
                    onChange={(e) => setNewCategory({ ...newCategory, area_id: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="">Select Area...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.range_start}-{a.range_end} {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newCategory.description}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, description: e.target.value })
                    }
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <button
                    onClick={handleCreateCategory}
                    className="bg-teal-600 text-white rounded px-4 py-2 hover:bg-teal-500 flex items-center justify-center gap-1"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="glass-card p-4 flex items-center gap-4">
                    {editingCategory?.id === cat.id ? (
                      <>
                        <input
                          type="number"
                          value={editingCategory.number}
                          onChange={(e) =>
                            setEditingCategory({
                              ...editingCategory,
                              number: parseInt(e.target.value),
                            })
                          }
                          className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        />
                        <select
                          value={editingCategory.area_id}
                          onChange={(e) =>
                            setEditingCategory({
                              ...editingCategory,
                              area_id: parseInt(e.target.value),
                            })
                          }
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        >
                          {areas.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) =>
                            setEditingCategory({ ...editingCategory, name: e.target.value })
                          }
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                        />
                        <button
                          onClick={() => handleUpdateCategory(editingCategory)}
                          className="p-2 bg-teal-600 rounded hover:bg-teal-500"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-2 bg-slate-600 rounded hover:bg-slate-500"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="jd-number text-teal-400 w-12">
                          {cat.number.toString().padStart(2, '0')}
                        </span>
                        <span className="text-slate-500 w-32">{cat.area_name}</span>
                        <span className="font-medium text-white flex-1">{cat.name}</span>
                        <span className="text-slate-400 flex-1">{cat.description}</span>
                        <button
                          onClick={() => setEditingCategory({ ...cat })}
                          className="p-2 hover:bg-slate-700 rounded"
                        >
                          <Edit2 size={16} className="text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 hover:bg-red-900/50 rounded"
                        >
                          <Trash2 size={16} className="text-slate-400 hover:text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cloud' && <CloudDriveSettings />}

          {activeTab === 'license' && <LicenseSettings />}

          {activeTab === 'database' && (
            <div className="space-y-6">
              <div className="glass-card p-4">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Table size={18} />
                  Table Browser
                </h3>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {tables.map((table) => (
                    <button
                      key={table}
                      onClick={() => handleTableSelect(table)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedTable === table
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {table}
                    </button>
                  ))}
                </div>

                {selectedTable && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600">
                          {tableData.columns.map((col, i) => (
                            <th key={i} className="text-left p-2 text-slate-400 font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.map((row, i) => (
                          <tr key={i} className="border-b border-slate-700 hover:bg-slate-800/50">
                            {row.map((cell, j) => (
                              <td key={j} className="p-2 text-slate-300 font-mono text-xs">
                                {cell === null ? (
                                  <span className="text-slate-500">NULL</span>
                                ) : (
                                  String(cell).substring(0, 50)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {tableData.rows.length === 0 && (
                      <p className="text-center text-slate-500 py-4">No data in table</p>
                    )}
                  </div>
                )}
              </div>

              <div className="glass-card p-4">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Terminal size={18} />
                  SQL Console
                </h3>
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter SQL query..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm h-32 focus:border-teal-500"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleExecuteSQL}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500 flex items-center gap-2"
                  >
                    <Terminal size={16} />
                    Execute
                  </button>
                  <button
                    onClick={() => {
                      setSqlQuery('');
                      setSqlResult(null);
                    }}
                    className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleResetDatabase}
                    className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 ml-auto flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Reset Database
                  </button>
                </div>

                {sqlResult && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${sqlResult.success ? 'bg-slate-800' : 'bg-red-900/30'}`}
                  >
                    {sqlResult.success ? (
                      <>
                        <p className="text-green-400 mb-2">Query executed successfully</p>
                        {sqlResult.results?.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-600">
                                  {sqlResult.results[0].columns.map((col, i) => (
                                    <th key={i} className="text-left p-2 text-slate-400">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sqlResult.results[0].values.map((row, i) => (
                                  <tr key={i} className="border-b border-slate-700">
                                    {row.map((cell, j) => (
                                      <td key={j} className="p-2 text-slate-300 font-mono text-xs">
                                        {String(cell)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-red-400">Error: {sqlResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && <FeedbackSettings />}
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
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
  const [items, setItems] = useState([]);

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

  // All core state/logic now handled by custom hooks:
  // - useAppData: Database init, areas, categories, folders, stats, refresh
  // - useSearch: Search query, results
  // - useNavigation: View state, breadcrumbs
  // - useFolderCRUD: Folder create/update/delete, editingFolder
  // - useItemCRUD: Item create/update/delete, editingItem
  // - useModalState: All modal visibility states

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await importDatabase(file);
      triggerRefresh();
      navigateTo('home');
    }
  };

  // Get display data based on current view - using useMemo for proper recalculation
  const displayFolders = React.useMemo(() => {
    if (searchQuery.trim()) return searchResults.folders;
    if (selectedCategory) return folders.filter((f) => f.category_id === selectedCategory.id);
    if (selectedArea) {
      const areaCatIds = categories.filter((c) => c.area_id === selectedArea.id).map((c) => c.id);
      return folders.filter((f) => areaCatIds.includes(f.category_id));
    }
    return folders;
  }, [searchQuery, searchResults.folders, selectedCategory, selectedArea, folders, categories]);

  const displayItems = React.useMemo(() => {
    if (searchQuery.trim()) return searchResults.items;
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
    <LicenseProvider>
      <DragDropProvider>
        <div className="min-h-screen flex">
          <Sidebar
            isOpen={sidebarOpen}
            areas={areas}
            categories={categories}
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
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
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
            categories={categories}
            folders={folders}
            onSave={handleCreateFolder}
            preselectedCategory={selectedCategory}
          />

          <NewItemModal
            isOpen={showNewItemModal}
            onClose={() => setShowNewItemModal(false)}
            folders={folders}
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
            categories={categories}
            onDataChange={triggerRefresh}
          />

          {/* File Organizer (full-screen overlay) */}
          {showFileOrganizer && <FileOrganizer onClose={() => setShowFileOrganizer(false)} />}

          {/* Statistics Dashboard (premium feature) */}
          {showStatsDashboard && <StatsDashboard onClose={() => setShowStatsDashboard(false)} />}

          {/* Batch Rename Modal (premium feature) */}
          {showBatchRename && <BatchRenameModal onClose={() => setShowBatchRename(false)} />}
        </div>
      </DragDropProvider>
    </LicenseProvider>
  );
}
