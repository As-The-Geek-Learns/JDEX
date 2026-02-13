import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

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

export default EditItemModal;
