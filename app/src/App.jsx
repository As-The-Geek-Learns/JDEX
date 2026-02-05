import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  FolderTree,
  Database,
  Settings,
  Download,
  Upload,
  Lock,
  Cloud,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Home,
  FileText,
  Briefcase,
  Code,
  Heart,
  BookOpen,
  Archive,
  Menu,
  Layers,
  Table,
  Terminal,
  File,
  ArrowLeft,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import {
  initDatabase,
  getAreas,
  getCategories,
  getFolders,
  getItems,
  searchAll,
  createFolder,
  updateFolder,
  deleteFolder,
  createItem,
  updateItem,
  deleteItem,
  getNextFolderNumber,
  getNextItemNumber,
  getStats,
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

// Area icon mapping
const areaIcons = {
  System: Database,
  Personal: Home,
  'UF Health': Briefcase,
  'As The Geek Learns': FileText,
  Development: Code,
  Resistance: Heart,
  Learning: BookOpen,
  Archive: Archive,
};

// Sensitivity badge component
function SensitivityBadge({ sensitivity, isInherited = false }) {
  const config = {
    standard: { label: 'Standard', class: 'bg-slate-600 text-slate-200', icon: Cloud },
    sensitive: { label: 'Sensitive', class: 'bg-red-900/50 text-red-300', icon: Lock },
    work: { label: 'Work', class: 'bg-blue-900/50 text-blue-300', icon: Briefcase },
    inherit: { label: 'Inherit', class: 'bg-purple-900/50 text-purple-300', icon: FolderTree },
  };

  const { label, class: className, icon: Icon } = config[sensitivity] || config.standard;

  return (
    <span
      className={`${className} px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1`}
    >
      <Icon size={10} />
      {isInherited ? `(${label})` : label}
    </span>
  );
}

// Breadcrumb navigation
function Breadcrumb({ path, onNavigate }) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={() => onNavigate('home')}
        className="text-slate-400 hover:text-teal-400 transition-colors"
      >
        <Home size={16} />
      </button>
      {path.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-slate-600" />
          <button
            onClick={() => onNavigate(item.type, item.data)}
            className={`transition-colors ${
              index === path.length - 1
                ? 'text-teal-400 font-medium'
                : 'text-slate-400 hover:text-teal-400'
            }`}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

// Folder Card Component
function FolderCard({ folder, onEdit, onDelete, onOpen }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-card p-4 hover-lift cursor-pointer border-l-4 animate-fade-in"
      style={{ borderLeftColor: folder.area_color }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1" onClick={() => onOpen(folder)}>
          <div className="flex items-center gap-3 mb-1">
            <FolderOpen size={18} className="text-amber-400" />
            <span className="jd-number text-lg text-teal-400">{folder.folder_number}</span>
            <SensitivityBadge sensitivity={folder.sensitivity} />
          </div>
          <h3 className="font-semibold text-white">{folder.name}</h3>
          <p className="text-sm text-slate-400">
            {folder.category_name} • {folder.area_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(folder);
            }}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Edit2 size={16} className="text-slate-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder);
            }}
            className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
          >
            <Trash2 size={16} className="text-slate-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 animate-fade-in">
          {folder.description && (
            <p className="text-sm text-slate-300 mb-3">{folder.description}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {folder.location && (
              <div>
                <span className="text-slate-500">Location:</span>
                <span className="ml-2 text-slate-300">{folder.location}</span>
              </div>
            )}
            {folder.storage_path && (
              <div className="col-span-2">
                <span className="text-slate-500">Path:</span>
                <span className="ml-2 text-slate-300 font-mono text-xs">{folder.storage_path}</span>
              </div>
            )}
            {folder.keywords && (
              <div className="col-span-2">
                <span className="text-slate-500">Keywords:</span>
                <span className="ml-2 text-slate-300">{folder.keywords}</span>
              </div>
            )}
          </div>
          {folder.notes && (
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-500 text-sm">Notes:</span>
              <p className="text-slate-300 text-sm mt-1">{folder.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Item Card Component
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

function formatFileSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

// Category Tree Component - Updated for drill-down
function CategoryTree({ areas, categories, selectedCategory, onSelectCategory, onSelectArea }) {
  const [expandedAreas, setExpandedAreas] = useState(new Set([1, 2, 3, 4, 5, 6, 7, 8]));

  const toggleArea = (areaId, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  return (
    <div className="space-y-1">
      {areas.map((area) => {
        const Icon = areaIcons[area.name] || FolderTree;
        const areaCategories = categories.filter((c) => c.area_id === area.id);
        const isExpanded = expandedAreas.has(area.id);

        return (
          <div key={area.id}>
            <button
              onClick={() => onSelectArea(area)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <span onClick={(e) => toggleArea(area.id, e)}>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <Icon size={16} style={{ color: area.color }} />
              <span className="font-medium text-sm">
                {area.range_start.toString().padStart(2, '0')}-
                {area.range_end.toString().padStart(2, '0')}
              </span>
              <span className="text-slate-400 text-sm truncate">{area.name}</span>
            </button>

            {isExpanded && (
              <div className="ml-6 space-y-0.5">
                {areaCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                      selectedCategory?.id === cat.id
                        ? 'bg-teal-600/30 text-teal-300'
                        : 'hover:bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    <span className="jd-number text-xs">
                      {cat.number.toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
            onClick={() => setActiveTab('database')}
            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'database' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Database size={16} className="inline mr-2" />
            Database
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
            <AlertCircle size={16} />
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
        </div>
      </div>
    </div>
  );
}

// Stats Dashboard - Updated for 4-level structure
function StatsDashboard({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="glass-card p-4">
        <div className="text-3xl font-bold text-amber-400">{stats.totalFolders}</div>
        <div className="text-sm text-slate-400 flex items-center gap-1">
          <FolderOpen size={14} /> Folders (XX.XX)
        </div>
      </div>
      <div className="glass-card p-4">
        <div className="text-3xl font-bold text-white">{stats.totalItems}</div>
        <div className="text-sm text-slate-400 flex items-center gap-1">
          <File size={14} /> Items (XX.XX.XX)
        </div>
      </div>
      <div className="glass-card p-4">
        <div className="text-3xl font-bold text-red-400">
          {stats.sensitiveFolders + stats.sensitiveItems}
        </div>
        <div className="text-sm text-slate-400 flex items-center gap-1">
          <Lock size={14} /> Sensitive
        </div>
      </div>
      <div className="glass-card p-4">
        <div className="text-3xl font-bold text-blue-400">
          {stats.workFolders + stats.workItems}
        </div>
        <div className="text-sm text-slate-400 flex items-center gap-1">
          <Briefcase size={14} /> Work
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [folders, setFolders] = useState([]);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});

  // Refresh trigger - increment to force data reload
  const [refreshKey, setRefreshKey] = useState(0);

  // Navigation state
  const [currentView, setCurrentView] = useState('home'); // home, area, category, folder
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ folders: [], items: [] });

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize database
  useEffect(() => {
    async function init() {
      await initDatabase();
      loadData();
      setIsLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(() => {
    setAreas(getAreas());
    setCategories(getCategories());
    setFolders(getFolders());
    setStats(getStats());
  }, []);

  // Trigger refresh helper - call this after any data mutation
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Reload data whenever refreshKey changes
  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [refreshKey, isLoading, loadData]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchAll(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults({ folders: [], items: [] });
    }
  }, [searchQuery]);

  // Load items when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      setItems(getItems(selectedFolder.id));
    }
  }, [selectedFolder]);

  // Navigation handlers
  const navigateTo = (type, data = null) => {
    setSearchQuery('');

    // Ensure data is fresh before navigating
    const freshFolders = getFolders();
    const freshCategories = getCategories();
    setFolders(freshFolders);
    setCategories(freshCategories);

    switch (type) {
      case 'home':
        setCurrentView('home');
        setSelectedArea(null);
        setSelectedCategory(null);
        setSelectedFolder(null);
        setBreadcrumbPath([]);
        break;
      case 'area':
        setCurrentView('area');
        setSelectedArea(data);
        setSelectedCategory(null);
        setSelectedFolder(null);
        setBreadcrumbPath([
          { type: 'area', data, label: `${data.range_start}-${data.range_end} ${data.name}` },
        ]);
        break;
      case 'category': {
        setCurrentView('category');
        setSelectedCategory(data);
        setSelectedFolder(null);
        // Find area for breadcrumb - use fresh data
        const area = areas.find((a) => a.id === data.area_id);
        setBreadcrumbPath([
          {
            type: 'area',
            data: area,
            label: `${area?.range_start}-${area?.range_end} ${area?.name}`,
          },
          {
            type: 'category',
            data,
            label: `${data.number.toString().padStart(2, '0')} ${data.name}`,
          },
        ]);
        break;
      }
      case 'folder': {
        setCurrentView('folder');
        setSelectedFolder(data);
        // Refresh items for this folder
        setItems(getItems(data.id));
        // Build full breadcrumb - use fresh categories data
        const folder = data;
        const cat = freshCategories.find((c) => c.id === folder.category_id);
        const ar = areas.find((a) => a.id === cat?.area_id);
        setBreadcrumbPath([
          { type: 'area', data: ar, label: `${ar?.range_start}-${ar?.range_end} ${ar?.name}` },
          {
            type: 'category',
            data: cat,
            label: `${cat?.number.toString().padStart(2, '0')} ${cat?.name}`,
          },
          { type: 'folder', data: folder, label: `${folder.folder_number} ${folder.name}` },
        ]);
        break;
      }
    }
  };

  // CRUD handlers
  const handleCreateFolder = (folderData) => {
    createFolder(folderData);
    triggerRefresh();
  };

  const handleUpdateFolder = (folderData) => {
    updateFolder(folderData.id, folderData);
    triggerRefresh();
  };

  const handleDeleteFolder = (folder) => {
    if (confirm(`Delete folder "${folder.folder_number} ${folder.name}"? This cannot be undone.`)) {
      try {
        deleteFolder(folder.id);
        triggerRefresh();
        if (selectedFolder?.id === folder.id) {
          navigateTo('category', selectedCategory);
        }
      } catch (e) {
        alert(e.message);
      }
    }
  };

  const handleCreateItem = (itemData) => {
    createItem(itemData);
    triggerRefresh();
    // Also refresh items for the current folder view
    if (selectedFolder) {
      setItems(getItems(selectedFolder.id));
    }
  };

  const handleUpdateItem = (itemData) => {
    updateItem(itemData.id, itemData);
    triggerRefresh();
    if (selectedFolder) {
      setItems(getItems(selectedFolder.id));
    }
  };

  const handleDeleteItem = (item) => {
    if (confirm(`Delete item "${item.item_number} ${item.name}"?`)) {
      deleteItem(item.id);
      triggerRefresh();
      if (selectedFolder) {
        setItems(getItems(selectedFolder.id));
      }
    }
  };

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse-subtle text-6xl mb-4">📁</div>
          <div className="text-xl text-slate-400">Loading JDex v2.0...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}
      >
        <div className="w-80 h-screen glass-card border-r border-slate-700 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <span className="text-xl font-bold text-white">JD</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  JDex <span className="text-xs text-teal-400">v2.0</span>
                </h1>
                <p className="text-xs text-slate-400">4-Level Johnny Decimal</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-slate-700 space-y-2">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
            >
              <FolderOpen size={18} />
              New Folder (XX.XX)
            </button>
            <button
              onClick={() => setShowNewItemModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors"
            >
              <Plus size={18} />
              New Item (XX.XX.XX)
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Settings size={18} />
              Settings
            </button>
          </div>

          {/* Navigation Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <button
                onClick={() => navigateTo('home')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'home' && !searchQuery
                    ? 'bg-teal-600/30 text-teal-300'
                    : 'hover:bg-slate-700/50'
                }`}
              >
                <Home size={16} />
                <span className="font-medium">Overview</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-3">
              Areas & Categories
            </div>
            <CategoryTree
              areas={areas}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => navigateTo('category', cat)}
              onSelectArea={(area) => navigateTo('area', area)}
            />
          </div>

          {/* Export/Import */}
          <div className="p-4 border-t border-slate-700 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={exportDatabase}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
              >
                <Download size={14} />
                Backup
              </button>
              <button
                onClick={exportToJSON}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
              >
                <FileText size={14} />
                JSON
              </button>
            </div>
            <label className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm cursor-pointer">
              <Upload size={14} />
              Import Backup
              <input type="file" accept=".sqlite" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="glass-card border-b border-slate-700 p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg"
            >
              <Menu size={20} />
            </button>

            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search folders and items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="text-sm text-slate-400">
              {displayFolders.length} folders, {displayItems.length} items
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Breadcrumb */}
          {breadcrumbPath.length > 0 && !searchQuery && (
            <Breadcrumb path={breadcrumbPath} onNavigate={navigateTo} />
          )}

          {/* Stats */}
          {currentView === 'home' && !searchQuery && <StatsDashboard stats={stats} />}

          {/* Current View Title */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {searchQuery
                ? `Search: "${searchQuery}"`
                : currentView === 'folder'
                  ? `${selectedFolder?.folder_number} ${selectedFolder?.name}`
                  : currentView === 'category'
                    ? `${selectedCategory?.number.toString().padStart(2, '0')} ${selectedCategory?.name}`
                    : currentView === 'area'
                      ? `${selectedArea?.range_start}-${selectedArea?.range_end} ${selectedArea?.name}`
                      : 'All Folders'}
            </h2>

            {currentView !== 'home' && !searchQuery && (
              <button
                onClick={() => navigateTo('home')}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back to Overview
              </button>
            )}
          </div>

          {/* Folders Section */}
          {(currentView !== 'folder' || searchQuery) && displayFolders.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <FolderOpen size={18} className="text-amber-400" />
                Folders ({displayFolders.length})
              </h3>
              <div className="space-y-3">
                {displayFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onEdit={setEditingFolder}
                    onDelete={handleDeleteFolder}
                    onOpen={(f) => navigateTo('folder', f)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Items Section */}
          {(currentView === 'folder' || searchQuery) && displayItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <File size={18} className="text-slate-400" />
                Items ({displayItems.length})
              </h3>
              <div className="space-y-3">
                {displayItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={setEditingItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {displayFolders.length === 0 && displayItems.length === 0 && (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4">{searchQuery ? '🔍' : '📂'}</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No results found' : 'No folders yet'}
              </h3>
              <p className="text-slate-400 mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first folder to start organizing'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
                >
                  <FolderOpen size={18} />
                  Create First Folder
                </button>
              )}
            </div>
          )}

          {/* Add Item prompt when in folder view */}
          {currentView === 'folder' && displayItems.length === 0 && !searchQuery && (
            <div className="glass-card p-8 text-center mt-4">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="text-lg font-semibold text-white mb-2">This folder is empty</h3>
              <p className="text-slate-400 mb-4">Add items to track files in this folder</p>
              <button
                onClick={() => setShowNewItemModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors"
              >
                <Plus size={18} />
                Add Item
              </button>
            </div>
          )}
        </div>
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
    </div>
  );
}
