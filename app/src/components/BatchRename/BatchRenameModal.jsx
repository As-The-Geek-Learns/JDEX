import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, FileEdit, Play, Undo2, AlertTriangle, CheckCircle, 
  Loader2, Lock, Sparkles 
} from 'lucide-react';
import { useLicense } from '../../context/LicenseContext.jsx';
import FileSelector from './FileSelector.jsx';
import RenamePreview from './RenamePreview.jsx';
import {
  generatePreview,
  executeBatchRename,
  undoBatchRename,
  getMostRecentUndoLog,
  checkBatchLimit,
} from '../../services/batchRenameService.js';

/**
 * BatchRenameModal Component
 * ===========================
 * Main modal for batch file renaming with pattern support.
 */
export default function BatchRenameModal({ onClose }) {
  const { isPremium, showUpgradePrompt } = useLicense();
  
  // State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [preview, setPreview] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [lastUndoId, setLastUndoId] = useState(null);
  
  // Rename options
  const [options, setOptions] = useState({
    addPrefix: false,
    prefix: '',
    addSuffix: false,
    suffix: '',
    findReplace: false,
    find: '',
    replace: '',
    replaceAll: true,
    addNumber: false,
    startNumber: 1,
    digits: 3,
    numberPosition: 'suffix',
    changeCase: false,
    caseType: 'lowercase',
  });

  // Check for existing undo log on mount
  useEffect(() => {
    const recent = getMostRecentUndoLog();
    if (recent) {
      setLastUndoId(recent.id);
    }
  }, []);

  // Update preview when files or options change
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const newPreview = generatePreview(selectedFiles, options);
      setPreview(newPreview);
    } else {
      setPreview([]);
    }
  }, [selectedFiles, options]);

  // Handle option changes
  const updateOption = useCallback((key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // Check batch limits
  const batchCheck = checkBatchLimit(selectedFiles.length, isPremium);
  const maxFiles = isPremium ? null : 5;

  // Execute rename
  const handleExecute = useCallback(async () => {
    if (!batchCheck.allowed) {
      showUpgradePrompt('Batch Rename');
      return;
    }

    const hasChanges = preview.some(p => p.willChange && !p.conflict);
    if (!hasChanges) return;

    setIsExecuting(true);
    setProgress({ current: 0, total: preview.filter(p => p.willChange).length });
    setResult(null);

    const execResult = await executeBatchRename(
      preview,
      {},
      (current, total) => setProgress({ current, total })
    );

    setIsExecuting(false);
    setResult(execResult);
    
    if (execResult.undoId) {
      setLastUndoId(execResult.undoId);
    }

    // Clear selection on success
    if (execResult.success && execResult.count > 0) {
      setSelectedFiles([]);
      setPreview([]);
    }
  }, [preview, batchCheck, showUpgradePrompt]);

  // Execute undo
  const handleUndo = useCallback(async () => {
    if (!lastUndoId) return;

    setIsExecuting(true);
    setResult(null);

    const undoResult = await undoBatchRename(
      lastUndoId,
      (current, total) => setProgress({ current, total })
    );

    setIsExecuting(false);
    setResult({
      ...undoResult,
      isUndo: true,
    });

    if (undoResult.success) {
      setLastUndoId(null);
    }
  }, [lastUndoId]);

  // Calculate stats
  const willChange = preview.filter(p => p.willChange && !p.conflict).length;
  const hasConflicts = preview.some(p => p.conflict);

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileEdit className="text-teal-400" />
            Batch Rename
            {!isPremium && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={10} />
                Free: {batchCheck.limit} files max
              </span>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* File Selection */}
          <section>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Select Files</h3>
            <FileSelector
              selectedFiles={selectedFiles}
              onFilesChange={setSelectedFiles}
              maxFiles={maxFiles}
            />
          </section>

          {/* Rename Options */}
          {selectedFiles.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Rename Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                
                {/* Add Prefix */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.addPrefix}
                      onChange={(e) => updateOption('addPrefix', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Add Prefix</span>
                  </label>
                  {options.addPrefix && (
                    <input
                      type="text"
                      value={options.prefix}
                      onChange={(e) => updateOption('prefix', e.target.value)}
                      placeholder="e.g., 12.01_"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  )}
                </div>

                {/* Add Suffix */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.addSuffix}
                      onChange={(e) => updateOption('addSuffix', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Add Suffix</span>
                  </label>
                  {options.addSuffix && (
                    <input
                      type="text"
                      value={options.suffix}
                      onChange={(e) => updateOption('suffix', e.target.value)}
                      placeholder="e.g., _final"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  )}
                </div>

                {/* Find & Replace */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.findReplace}
                      onChange={(e) => updateOption('findReplace', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Find & Replace</span>
                  </label>
                  {options.findReplace && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={options.find}
                        onChange={(e) => updateOption('find', e.target.value)}
                        placeholder="Find..."
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-slate-400">→</span>
                      <input
                        type="text"
                        value={options.replace}
                        onChange={(e) => updateOption('replace', e.target.value)}
                        placeholder="Replace with..."
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  )}
                </div>

                {/* Add Numbers */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.addNumber}
                      onChange={(e) => updateOption('addNumber', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Add Sequential Number</span>
                  </label>
                  {options.addNumber && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-slate-400">Start</label>
                        <input
                          type="number"
                          value={options.startNumber}
                          onChange={(e) => updateOption('startNumber', parseInt(e.target.value) || 1)}
                          min="0"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-400">Digits</label>
                        <input
                          type="number"
                          value={options.digits}
                          onChange={(e) => updateOption('digits', parseInt(e.target.value) || 1)}
                          min="1"
                          max="6"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-400">Position</label>
                        <select
                          value={options.numberPosition}
                          onChange={(e) => updateOption('numberPosition', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="suffix">End</option>
                          <option value="prefix">Start</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change Case */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.changeCase}
                      onChange={(e) => updateOption('changeCase', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm">Change Case</span>
                  </label>
                  {options.changeCase && (
                    <select
                      value={options.caseType}
                      onChange={(e) => updateOption('caseType', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="lowercase">lowercase</option>
                      <option value="uppercase">UPPERCASE</option>
                      <option value="titlecase">Title Case</option>
                      <option value="sentencecase">Sentence case</option>
                    </select>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Preview */}
          {selectedFiles.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Preview</h3>
              <RenamePreview preview={preview} />
            </section>
          )}

          {/* Result Message */}
          {result && (
            <div className={`
              p-4 rounded-lg flex items-start gap-3
              ${result.success ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}
            `}>
              {result.success ? (
                <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
              ) : (
                <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
              )}
              <div>
                <p className={result.success ? 'text-green-300' : 'text-red-300'}>
                  {result.isUndo 
                    ? `Undone ${result.count} file rename${result.count !== 1 ? 's' : ''}`
                    : `Renamed ${result.count} of ${result.total} file${result.total !== 1 ? 's' : ''}`
                  }
                </p>
                {result.errors && result.errors.length > 0 && (
                  <ul className="mt-2 text-sm text-red-300/70">
                    {result.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>• {err.file}: {err.error}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li>... and {result.errors.length - 3} more errors</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            {lastUndoId && !isExecuting && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Undo2 size={16} />
                Undo Last
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleExecute}
              disabled={isExecuting || willChange === 0}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
                ${willChange > 0 && !isExecuting
                  ? 'bg-teal-600 text-white hover:bg-teal-500'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {isExecuting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {progress.current} / {progress.total}
                </>
              ) : (
                <>
                  <Play size={16} />
                  Rename {willChange} File{willChange !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Conflicts Warning */}
        {hasConflicts && !isExecuting && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertTriangle size={16} />
              Some files have conflicts and will be skipped
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
