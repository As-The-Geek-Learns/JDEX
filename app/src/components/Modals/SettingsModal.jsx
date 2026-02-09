import React, { useState } from 'react';
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
  Plus,
  Settings,
} from 'lucide-react';
import CloudDriveSettings from '../Settings/CloudDriveSettings.jsx';
import LicenseSettings from '../Settings/LicenseSettings.jsx';
import FeedbackSettings from '../Settings/FeedbackSettings.jsx';
import {
  createArea,
  updateArea,
  deleteArea,
  createCategory,
  updateCategory,
  deleteCategory,
  executeSQL,
  getTableData,
  resetDatabase,
} from '../../db.js';

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

export default SettingsModal;
