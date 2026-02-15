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

import type { ReactNode, JSX } from 'react';
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

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Action types for undo/redo operations
 */
export const ACTION_TYPES = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const);

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

/**
 * Entity types that support undo/redo
 */
export const ENTITY_TYPES = Object.freeze({
  FOLDER: 'folder',
  ITEM: 'item',
} as const);

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

/**
 * Entity data stored in undo actions.
 * Uses Record type since we store full database rows with varying fields.
 */
export type EntityData = Record<string, unknown>;

/**
 * Base action interface
 */
interface BaseAction {
  id: string;
  type: ActionType;
  entityType: EntityType;
  timestamp: number;
  wasUndone?: boolean;
  wasRedone?: boolean;
}

/**
 * Create action - stores the created entity data
 */
export interface CreateAction extends BaseAction {
  type: 'CREATE';
  entityId: number;
  entityData: EntityData;
}

/**
 * Update action - stores previous and new state
 */
export interface UpdateAction extends BaseAction {
  type: 'UPDATE';
  entityId: number;
  previousState: Partial<EntityData>;
  newState: Partial<EntityData>;
}

/**
 * Delete action - stores the deleted entity
 */
export interface DeleteAction extends BaseAction {
  type: 'DELETE';
  entityId: number;
  deletedEntity: EntityData;
}

/**
 * Union of all action types
 */
export type UndoAction = CreateAction | UpdateAction | DeleteAction;

/**
 * Stored undo history structure
 */
interface StoredHistory {
  version: number;
  undoStack: UndoAction[];
  redoStack: UndoAction[];
  savedAt: number;
}

/**
 * Context value for undo operations
 */
export interface UndoContextValue {
  // State
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastAction: UndoAction | null;
  lastActionTimestamp: number | null;

  // Actions
  pushAction: (action: Omit<UndoAction, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

/**
 * Props for the UndoProvider component
 */
export interface UndoProviderProps {
  children: ReactNode;
  onRefresh?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'jdex_undo_history_v1';
const MAX_STACK_SIZE = 50;
const MAX_AGE_DAYS = 7;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Load undo history from localStorage
 * Filters out actions older than MAX_AGE_DAYS
 */
function loadHistory(): { undoStack: UndoAction[]; redoStack: UndoAction[] } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { undoStack: [], redoStack: [] };

    const data = JSON.parse(stored) as StoredHistory;

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
function saveHistory(undoStack: UndoAction[], redoStack: UndoAction[]): void {
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
      } satisfies StoredHistory)
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
        } satisfies StoredHistory)
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
function executeUndo(action: UndoAction): void {
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

    case ACTION_TYPES.DELETE: {
      // Undo delete = recreate the entity
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        // Check if parent category still exists before recreating
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...folderData
        } = action.deletedEntity;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createFolder(folderData as any);
      } else {
        // Check if parent folder still exists
        const itemData = action.deletedEntity;
        const parentFolder = getFolder(itemData.folder_id as number);
        if (!parentFolder) {
          throw new Error(`Cannot undo: parent folder no longer exists`);
        }
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...cleanItemData
        } = itemData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createItem(cleanItemData as any);
      }
      break;
    }

    default:
      throw new Error(`Unknown action type: ${(action as UndoAction).type}`);
  }
  saveDatabase();
}

/**
 * Execute an action (for redo)
 */
function executeRedo(action: UndoAction): void {
  switch (action.type) {
    case ACTION_TYPES.CREATE: {
      // Redo create = recreate the entity
      if (action.entityType === ENTITY_TYPES.FOLDER) {
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...folderData
        } = action.entityData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newId = createFolder(folderData as any);
        // Update action with new ID for future undos
        (action as CreateAction).entityId = newId;
      } else {
        const {
          id: _id,
          created_at: _created,
          updated_at: _updated,
          ...itemData
        } = action.entityData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newId = createItem(itemData as any);
        (action as CreateAction).entityId = newId;
      }
      break;
    }

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
        deleteFolder(action.deletedEntity.id as number);
      } else {
        deleteItem(action.deletedEntity.id as number);
      }
      break;

    default:
      throw new Error(`Unknown action type: ${(action as UndoAction).type}`);
  }
  saveDatabase();
}

// ============================================
// CONTEXT
// ============================================

const UndoContext = createContext<UndoContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

/**
 * UndoProvider component
 * Wraps the app to provide undo/redo functionality
 */
export function UndoProvider({ children, onRefresh }: UndoProviderProps): JSX.Element {
  // Initialize state from localStorage
  const [undoStack, setUndoStack] = useState<UndoAction[]>(() => loadHistory().undoStack);
  const [redoStack, setRedoStack] = useState<UndoAction[]>(() => loadHistory().redoStack);
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);
  const [lastActionTimestamp, setLastActionTimestamp] = useState<number | null>(null);

  // Persist to localStorage when stacks change
  useEffect(() => {
    saveHistory(undoStack, redoStack);
  }, [undoStack, redoStack]);

  /**
   * Push a new action to the undo stack
   * Clears redo stack (new action invalidates redo history)
   */
  const pushAction = useCallback(
    (action: Omit<UndoAction, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): void => {
      const actionWithId: UndoAction = {
        ...action,
        id: action.id || crypto.randomUUID(),
        timestamp: action.timestamp || Date.now(),
      } as UndoAction;

      setUndoStack((prev) => [...prev.slice(-(MAX_STACK_SIZE - 1)), actionWithId]);
      setRedoStack([]); // Clear redo stack on new action
      setLastAction(actionWithId);
      setLastActionTimestamp(Date.now());
    },
    []
  );

  /**
   * Undo the last action
   */
  const undo = useCallback((): void => {
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
      alert(`Undo failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [undoStack, onRefresh]);

  /**
   * Redo the last undone action
   */
  const redo = useCallback((): void => {
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
      alert(`Redo failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [redoStack, onRefresh]);

  /**
   * Clear all undo/redo history
   * Called when database is reset
   */
  const clearHistory = useCallback((): void => {
    setUndoStack([]);
    setRedoStack([]);
    setLastAction(null);
    setLastActionTimestamp(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<UndoContextValue>(
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

// ============================================
// DEFAULT CONTEXT VALUE
// ============================================

// No-op functions for when context is not available
const noopPushAction = (): void => {};
const noopUndo = (): void => {};
const noopRedo = (): void => {};
const noopClearHistory = (): void => {};

const defaultContextValue: UndoContextValue = {
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

// ============================================
// HOOK
// ============================================

/**
 * Hook to access undo context
 * Returns safe defaults if used outside UndoProvider (for initial render)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext);
  // Return safe defaults if not in provider (e.g., during initial render)
  // This allows hooks that use useUndo to work before provider mounts
  return context || defaultContextValue;
}

export default UndoContext;
