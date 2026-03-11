/**
 * Undo Context
 * ============
 * Provides undo/redo functionality for folder and item CRUD operations.
 *
 * WHAT: Manages undo/redo stacks with localStorage persistence.
 *       Captures before/after state for all CRUD operations.
 *
 * WHY: Users need to reverse accidental changes without data loss.
 *      Persistence ensures undo history survives app restarts.
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  createFolder,
  updateFolder,
  deleteFolder,
  getFolder,
  createItem,
  updateItem,
  deleteItem,
  saveDatabase,
} from '../db.js';

// Constants
const STORAGE_KEY = 'jdex_undo_history_v1';
const MAX_STACK_SIZE = 50;
const MAX_AGE_DAYS = 7;

/**
 * Action types for undo/redo operations
 */
export const ACTION_TYPES = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
});

/**
 * Entity types that support undo/redo
 */
export const ENTITY_TYPES = Object.freeze({
  FOLDER: 'folder',
  ITEM: 'item',
});

// Create context
const UndoContext = createContext(null);

/**
 * Load undo history from localStorage
 * Filters out actions older than MAX_AGE_DAYS
 */
function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { undoStack: [], redoStack: [] };

    const data = JSON.parse(stored);

    // Validate version
    if (data.version !== 1) return { undoStack: [], redoStack: [] };

    // Filter out old actions
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const undoStack = (data.undoStack || []).filter((a) => a.timestamp > cutoff);
    const redoStack = (data.redoStack || []).filter((a) => a.timestamp > cutoff);

    return { undoStack, redoStack };
  } catch (_e) {
    return { undoStack: [], redoStack: [] };
  }
}

/**
 * Save undo history to localStorage
 * Trims stacks to MAX_STACK_SIZE
 */
function saveHistory(undoStack, redoStack) {
  try {
    const trimmedUndo = undoStack.slice(-MAX_STACK_SIZE);
    const trimmedRedo = redoStack.slice(-MAX_STACK_SIZE);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        undoStack: trimmedUndo,
        redoStack: trimmedRedo,
        savedAt: Date.now(),
      })
    );
  } catch (_e) {
    // localStorage quota exceeded - clear oldest entries
    console.warn('Undo history storage full, clearing oldest entries');
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          undoStack: undoStack.slice(-25),
          redoStack: redoStack.slice(-25),
          savedAt: Date.now(),
        })
      );
    } catch (_e2) {
      // Still failing - clear entirely
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

/**
 * Execute the reverse of an action (for undo)
 */
function executeUndo(action) {
  switch (action.type) {
    case ACTION_TYPES.CREATE:
      // Undo create = delete the entity
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        deleteFolder(action.entityId);
      } else {
        deleteItem(action.entityId);
      }
      break;

    case ACTION_TYPES.UPDATE:
      // Undo update = restore previous state
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        updateFolder(action.entityId, action.previousState);
      } else {
        updateItem(action.entityId, action.previousState);
      }
      break;

    case ACTION_TYPES.DELETE:
      // Undo delete = recreate the entity
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        // Check if parent category still exists before recreating
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...folderData
        } = action.deletedEntity;
        createFolder(folderData);
      } else {
        // Check if parent folder still exists
        const parentFolder = getFolder(action.deletedEntity.folder_id);
        if (!parentFolder) {
          throw new Error(`Cannot undo: parent folder no longer exists`);
        }
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...itemData
        } = action.deletedEntity;
        createItem(itemData);
      }
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
  saveDatabase();
}

/**
 * Execute an action (for redo)
 */
function executeRedo(action) {
  switch (action.type) {
    case ACTION_TYPES.CREATE:
      // Redo create = recreate the entity
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...folderData
        } = action.entityData;
        const newId = createFolder(folderData);
        // Update action with new ID for future undos
        action.entityId = newId;
      } else {
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...itemData
        } = action.entityData;
        const newId = createItem(itemData);
        action.entityId = newId;
      }
      break;

    case ACTION_TYPES.UPDATE:
      // Redo update = apply new state
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        updateFolder(action.entityId, action.newState);
      } else {
        updateItem(action.entityId, action.newState);
      }
      break;

    case ACTION_TYPES.DELETE:
      // Redo delete = delete again
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        deleteFolder(action.deletedEntity.id);
      } else {
        deleteItem(action.deletedEntity.id);
      }
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
  saveDatabase();
}

/**
 * UndoProvider component
 * Wraps the app to provide undo/redo functionality
 */
export function UndoProvider({ children, onRefresh }) {
  // Initialize state from localStorage
  const [undoStack, setUndoStack] = useState(() => loadHistory().undoStack);
  const [redoStack, setRedoStack] = useState(() => loadHistory().redoStack);
  const [lastAction, setLastAction] = useState(null);
  const [lastActionTimestamp, setLastActionTimestamp] = useState(null);

  // Persist to localStorage when stacks change
  useEffect(() => {
    saveHistory(undoStack, redoStack);
  }, [undoStack, redoStack]);

  /**
   * Push a new action to the undo stack
   * Clears redo stack (new action invalidates redo history)
   */
  const pushAction = useCallback((action) => {
    const actionWithId = {
      ...action,
      id: action.id || crypto.randomUUID(),
      timestamp: action.timestamp || Date.now(),
    };

    setUndoStack((prev) => [...prev.slice(-(MAX_STACK_SIZE - 1)), actionWithId]);
    setRedoStack([]); // Clear redo stack on new action
    setLastAction(actionWithId);
    setLastActionTimestamp(Date.now());
  }, []);

  /**
   * Undo the last action
   */
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];

    try {
      executeUndo(action);

      // Move action to redo stack
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, action]);
      setLastAction({ ...action, wasUndone: true });
      setLastActionTimestamp(Date.now());

      // Trigger UI refresh
      onRefresh?.();
    } catch (error) {
      console.error('Undo failed:', error);
      // Show error to user
      alert(`Undo failed: ${error.message}`);
    }
  }, [undoStack, onRefresh]);

  /**
   * Redo the last undone action
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];

    try {
      executeRedo(action);

      // Move action back to undo stack
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, action]);
      setLastAction({ ...action, wasRedone: true });
      setLastActionTimestamp(Date.now());

      // Trigger UI refresh
      onRefresh?.();
    } catch (error) {
      console.error('Redo failed:', error);
      alert(`Redo failed: ${error.message}`);
    }
  }, [redoStack, onRefresh]);

  /**
   * Clear all undo/redo history
   * Called when database is reset
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    setLastAction(null);
    setLastActionTimestamp(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      // State
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoCount: undoStack.length,
      redoCount: redoStack.length,
      lastAction,
      lastActionTimestamp,

      // Actions
      pushAction,
      undo,
      redo,
      clearHistory,
    }),
    [
      undoStack.length,
      redoStack.length,
      lastAction,
      lastActionTimestamp,
      pushAction,
      undo,
      redo,
      clearHistory,
    ]
  );

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

// No-op functions for when context is not available
const noopPushAction = () => {};
const noopUndo = () => {};
const noopRedo = () => {};
const noopClearHistory = () => {};

const defaultContextValue = {
  canUndo: false,
  canRedo: false,
  undoCount: 0,
  redoCount: 0,
  lastAction: null,
  lastActionTimestamp: null,
  pushAction: noopPushAction,
  undo: noopUndo,
  redo: noopRedo,
  clearHistory: noopClearHistory,
};

/**
 * Hook to access undo context
 * Returns safe defaults if used outside UndoProvider (for initial render)
 */
export function useUndo() {
  const context = useContext(UndoContext);
  // Return safe defaults if not in provider (e.g., during initial render)
  // This allows hooks that use useUndo to work before provider mounts
  return context || defaultContextValue;
}

export default UndoContext;
