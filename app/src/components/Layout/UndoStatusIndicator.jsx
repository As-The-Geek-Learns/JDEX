/**
 * Undo Status Indicator
 * =====================
 * Displays the last undo/redo action and stack counts in the header.
 *
 * WHAT: Shows visual feedback for undo/redo operations.
 *
 * WHY: Users need to know what action was performed and that
 *      undo/redo is available.
 */

import { useEffect, useState } from 'react';
import { Undo2, Redo2, Trash2, Edit3, Plus } from 'lucide-react';
import { useUndo, ACTION_TYPES } from '../../context/UndoContext.jsx';

/**
 * Get the appropriate icon for an action
 */
function getActionIcon(action) {
  if (!action) return null;

  if (action.wasUndone) return <Undo2 size={14} className="text-amber-400" />;
  if (action.wasRedone) return <Redo2 size={14} className="text-teal-400" />;

  switch (action.type) {
    case ACTION_TYPES.CREATE:
      return <Plus size={14} className="text-green-400" />;
    case ACTION_TYPES.UPDATE:
      return <Edit3 size={14} className="text-blue-400" />;
    case ACTION_TYPES.DELETE:
      return <Trash2 size={14} className="text-red-400" />;
    default:
      return null;
  }
}

/**
 * Format the action description for display
 */
function formatDescription(action) {
  if (!action) return '';

  if (action.wasUndone) {
    return `Undid: ${action.description}`;
  }
  if (action.wasRedone) {
    return `Redid: ${action.description}`;
  }

  return action.description;
}

/**
 * UndoStatusIndicator Component
 * Shows the last action and undo/redo availability
 */
function UndoStatusIndicator() {
  const { lastAction, lastActionTimestamp, canUndo, canRedo, undoCount, redoCount } = useUndo();
  const [visible, setVisible] = useState(false);

  // Show indicator when action occurs, fade out after 4 seconds
  useEffect(() => {
    if (lastActionTimestamp) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastActionTimestamp]);

  // Don't render if nothing to show
  if (!canUndo && !canRedo && !visible) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Last action description - fades out */}
      <div
        className={`flex items-center gap-1.5 transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {lastAction && (
          <>
            {getActionIcon(lastAction)}
            <span className="text-slate-400 truncate max-w-48">
              {formatDescription(lastAction)}
            </span>
          </>
        )}
      </div>

      {/* Undo/Redo counts - always visible when stacks have items */}
      {(canUndo || canRedo) && (
        <div className="flex items-center gap-2 text-xs text-slate-500 border-l border-slate-700 pl-3">
          {canUndo && (
            <span
              className="flex items-center gap-1 hover:text-slate-400 cursor-default"
              title={`${undoCount} action${undoCount !== 1 ? 's' : ''} to undo (Cmd+Z)`}
            >
              <Undo2 size={12} />
              <span>{undoCount}</span>
            </span>
          )}
          {canRedo && (
            <span
              className="flex items-center gap-1 hover:text-slate-400 cursor-default"
              title={`${redoCount} action${redoCount !== 1 ? 's' : ''} to redo (Cmd+Shift+Z)`}
            >
              <Redo2 size={12} />
              <span>{redoCount}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default UndoStatusIndicator;
