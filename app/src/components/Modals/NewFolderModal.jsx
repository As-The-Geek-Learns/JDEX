import { useState, useEffect } from 'react';
import { FolderOpen, X, Plus } from 'lucide-react';
import { getNextFolderNumber } from '../../db.js';

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

export default NewFolderModal;
