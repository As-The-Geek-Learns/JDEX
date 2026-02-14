import { useState, useEffect } from 'react';
import { File, X, Plus } from 'lucide-react';
import { getNextItemNumber } from '../../db.js';

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

export default NewItemModal;
