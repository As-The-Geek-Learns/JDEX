import React, { useState } from 'react';
import { Edit2, Trash2, X, Check, CircleAlert, Plus } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '../../db.js';

function CategoriesTab({ areas, categories, onDataChange }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    number: '',
    area_id: '',
    name: '',
    description: '',
  });
  const [error, setError] = useState('');

  const handleCreateCategory = () => {
    try {
      if (!newCategory.number || !newCategory.area_id || !newCategory.name) {
        setError('Number, area, and name are required');
        return;
      }
      const catNumber = parseInt(newCategory.number, 10);
      const areaId = parseInt(newCategory.area_id, 10);
      if (isNaN(catNumber) || isNaN(areaId)) {
        setError('Number and area must be valid');
        return;
      }
      createCategory({
        number: catNumber,
        area_id: areaId,
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
      const catNumber = parseInt(cat.number, 10);
      const areaId = parseInt(cat.area_id, 10);
      if (isNaN(catNumber) || isNaN(areaId)) {
        setError('Number and area must be valid');
        return;
      }
      updateCategory(cat.id, {
        ...cat,
        number: catNumber,
        area_id: areaId,
      });
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 flex items-center gap-2">
          <CircleAlert size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

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
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
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
                      number: e.target.value,
                    })
                  }
                  className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                />
                <select
                  value={editingCategory.area_id}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      area_id: e.target.value,
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
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                />
                <input
                  type="text"
                  value={editingCategory.description || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                  placeholder="Description"
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
  );
}

export default CategoriesTab;
