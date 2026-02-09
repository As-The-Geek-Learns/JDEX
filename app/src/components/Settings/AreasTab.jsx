import React, { useState } from 'react';
import { Edit2, Trash2, X, Check, CircleAlert, Plus } from 'lucide-react';
import { createArea, updateArea, deleteArea } from '../../db.js';

function AreasTab({ areas, onDataChange }) {
  const [editingArea, setEditingArea] = useState(null);
  const [newArea, setNewArea] = useState({
    range_start: '',
    range_end: '',
    name: '',
    description: '',
    color: '#64748b',
  });
  const [error, setError] = useState('');

  const handleCreateArea = () => {
    try {
      if (!newArea.range_start || !newArea.range_end || !newArea.name) {
        setError('Range start, end, and name are required');
        return;
      }
      const rangeStart = parseInt(newArea.range_start, 10);
      const rangeEnd = parseInt(newArea.range_end, 10);
      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        setError('Range values must be valid numbers');
        return;
      }
      createArea({
        range_start: rangeStart,
        range_end: rangeEnd,
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
      const rangeStart = parseInt(area.range_start, 10);
      const rangeEnd = parseInt(area.range_end, 10);
      if (isNaN(rangeStart) || isNaN(rangeEnd)) {
        setError('Range values must be valid numbers');
        return;
      }
      updateArea(area.id, {
        ...area,
        range_start: rangeStart,
        range_end: rangeEnd,
      });
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
                      range_start: e.target.value,
                    })
                  }
                  className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="number"
                  value={editingArea.range_end}
                  onChange={(e) => setEditingArea({ ...editingArea, range_end: e.target.value })}
                  className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                />
                <input
                  type="text"
                  value={editingArea.name}
                  onChange={(e) => setEditingArea({ ...editingArea, name: e.target.value })}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                />
                <input
                  type="text"
                  value={editingArea.description || ''}
                  onChange={(e) => setEditingArea({ ...editingArea, description: e.target.value })}
                  placeholder="Description"
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                />
                <input
                  type="color"
                  value={editingArea.color}
                  onChange={(e) => setEditingArea({ ...editingArea, color: e.target.value })}
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
                <div className="w-4 h-4 rounded" style={{ backgroundColor: area.color }}></div>
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
  );
}

export default AreasTab;
