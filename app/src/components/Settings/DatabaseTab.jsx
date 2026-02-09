import React, { useState } from 'react';
import { Table, Terminal, RefreshCw } from 'lucide-react';
import { executeSQL, getTableData, resetDatabase } from '../../db.js';

function DatabaseTab({ onDataChange }) {
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState({ columns: [], rows: [] });

  const tables = ['areas', 'categories', 'folders', 'items', 'storage_locations', 'activity_log'];

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

  return (
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
  );
}

export default DatabaseTab;
