/**
 * Undo Context Tests
 * ==================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UndoProvider, useUndo, ACTION_TYPES, ENTITY_TYPES } from '../UndoContext.jsx';

// Mock database functions
vi.mock('../../db.js', () => ({
  createFolder: vi.fn(() => 1),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
  getFolder: vi.fn((id) => ({ id, folder_number: '11.01', name: 'Test Folder' })),
  createItem: vi.fn(() => 1),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  getItem: vi.fn((id) => ({ id, item_number: '11.01.001', name: 'Test Item' })),
  saveDatabase: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Test component to access undo context
function TestComponent({ onRender }) {
  const context = useUndo();
  onRender?.(context);
  return (
    <div>
      <span data-testid="canUndo">{context.canUndo ? 'true' : 'false'}</span>
      <span data-testid="canRedo">{context.canRedo ? 'true' : 'false'}</span>
      <span data-testid="undoCount">{context.undoCount}</span>
      <span data-testid="redoCount">{context.redoCount}</span>
      <button
        onClick={() =>
          context.pushAction({
            type: ACTION_TYPES.CREATE,
            entityType: ENTITY_TYPES.FOLDER,
            entityId: 1,
            entityData: { id: 1, folder_number: '11.01', name: 'Test' },
            description: 'Created folder',
          })
        }
      >
        Push Create
      </button>
      <button
        onClick={() =>
          context.pushAction({
            type: ACTION_TYPES.UPDATE,
            entityType: ENTITY_TYPES.FOLDER,
            entityId: 1,
            previousState: { id: 1, name: 'Old Name' },
            newState: { id: 1, name: 'New Name' },
            description: 'Updated folder',
          })
        }
      >
        Push Update
      </button>
      <button
        onClick={() =>
          context.pushAction({
            type: ACTION_TYPES.DELETE,
            entityType: ENTITY_TYPES.FOLDER,
            entityId: 1,
            deletedEntity: { id: 1, folder_number: '11.01', name: 'Test', category_id: 1 },
            description: 'Deleted folder',
          })
        }
      >
        Push Delete
      </button>
      <button onClick={context.undo}>Undo</button>
      <button onClick={context.redo}>Redo</button>
      <button onClick={context.clearHistory}>Clear</button>
    </div>
  );
}

describe('UndoContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('UndoProvider', () => {
    it('should provide context to children', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      expect(screen.getByTestId('canUndo')).toBeInTheDocument();
      expect(screen.getByTestId('canRedo')).toBeInTheDocument();
    });

    it('should initialize with empty stacks', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      expect(screen.getByTestId('canUndo').textContent).toBe('false');
      expect(screen.getByTestId('canRedo').textContent).toBe('false');
      expect(screen.getByTestId('undoCount').textContent).toBe('0');
      expect(screen.getByTestId('redoCount').textContent).toBe('0');
    });

    it('should load history from localStorage', () => {
      const storedHistory = {
        version: 1,
        undoStack: [
          {
            id: 'test-1',
            type: ACTION_TYPES.CREATE,
            entityType: ENTITY_TYPES.FOLDER,
            timestamp: Date.now(),
            entityId: 1,
            entityData: { id: 1 },
            description: 'Test action',
          },
        ],
        redoStack: [],
        savedAt: Date.now(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedHistory));

      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      expect(screen.getByTestId('undoCount').textContent).toBe('1');
    });
  });

  describe('pushAction', () => {
    it('should add action to undo stack', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));

      expect(screen.getByTestId('canUndo').textContent).toBe('true');
      expect(screen.getByTestId('undoCount').textContent).toBe('1');
    });

    it('should clear redo stack on new action', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      // Push, undo, then push again
      fireEvent.click(screen.getByText('Push Create'));
      fireEvent.click(screen.getByText('Undo'));
      expect(screen.getByTestId('canRedo').textContent).toBe('true');

      fireEvent.click(screen.getByText('Push Update'));
      expect(screen.getByTestId('canRedo').textContent).toBe('false');
      expect(screen.getByTestId('redoCount').textContent).toBe('0');
    });

    it('should persist to localStorage', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)[1]);
      expect(savedData.undoStack.length).toBe(1);
    });
  });

  describe('undo', () => {
    it('should move action from undo to redo stack', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));
      expect(screen.getByTestId('undoCount').textContent).toBe('1');

      fireEvent.click(screen.getByText('Undo'));

      expect(screen.getByTestId('undoCount').textContent).toBe('0');
      expect(screen.getByTestId('redoCount').textContent).toBe('1');
      expect(screen.getByTestId('canRedo').textContent).toBe('true');
    });

    it('should do nothing when undo stack is empty', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Undo'));

      expect(screen.getByTestId('undoCount').textContent).toBe('0');
      expect(screen.getByTestId('redoCount').textContent).toBe('0');
    });
  });

  describe('redo', () => {
    it('should move action from redo to undo stack', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));
      fireEvent.click(screen.getByText('Undo'));
      expect(screen.getByTestId('redoCount').textContent).toBe('1');

      fireEvent.click(screen.getByText('Redo'));

      expect(screen.getByTestId('undoCount').textContent).toBe('1');
      expect(screen.getByTestId('redoCount').textContent).toBe('0');
    });

    it('should do nothing when redo stack is empty', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Redo'));

      expect(screen.getByTestId('undoCount').textContent).toBe('0');
      expect(screen.getByTestId('redoCount').textContent).toBe('0');
    });
  });

  describe('clearHistory', () => {
    it('should empty both stacks', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));
      fireEvent.click(screen.getByText('Push Update'));
      fireEvent.click(screen.getByText('Undo'));

      expect(screen.getByTestId('undoCount').textContent).toBe('1');
      expect(screen.getByTestId('redoCount').textContent).toBe('1');

      fireEvent.click(screen.getByText('Clear'));

      expect(screen.getByTestId('undoCount').textContent).toBe('0');
      expect(screen.getByTestId('redoCount').textContent).toBe('0');
    });

    it('should remove from localStorage', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));
      fireEvent.click(screen.getByText('Clear'));

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('jdex_undo_history_v1');
    });
  });

  describe('useUndo hook', () => {
    it('should return safe defaults when used outside provider', () => {
      let capturedContext = null;
      render(<TestComponent onRender={(ctx) => (capturedContext = ctx)} />);

      expect(capturedContext.canUndo).toBe(false);
      expect(capturedContext.canRedo).toBe(false);
      expect(capturedContext.undoCount).toBe(0);
      expect(capturedContext.redoCount).toBe(0);
    });

    it('should allow pushAction to be called outside provider (no-op)', () => {
      let capturedContext = null;
      render(<TestComponent onRender={(ctx) => (capturedContext = ctx)} />);

      // Should not throw
      expect(() => capturedContext.pushAction({ type: 'CREATE' })).not.toThrow();
    });
  });

  describe('stack size limits', () => {
    it('should limit undo stack to 50 items', () => {
      render(
        <UndoProvider>
          <TestComponent />
        </UndoProvider>
      );

      // Push 55 actions
      for (let i = 0; i < 55; i++) {
        fireEvent.click(screen.getByText('Push Create'));
      }

      // Check localStorage was called with trimmed stack
      const lastCall = localStorageMock.setItem.mock.calls.at(-1);
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.undoStack.length).toBeLessThanOrEqual(50);
    });
  });

  describe('onRefresh callback', () => {
    it('should call onRefresh after undo', () => {
      const onRefresh = vi.fn();
      render(
        <UndoProvider onRefresh={onRefresh}>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));
      fireEvent.click(screen.getByText('Undo'));

      expect(onRefresh).toHaveBeenCalled();
    });

    it('should call onRefresh after redo', () => {
      const onRefresh = vi.fn();
      render(
        <UndoProvider onRefresh={onRefresh}>
          <TestComponent />
        </UndoProvider>
      );

      fireEvent.click(screen.getByText('Push Create'));
      fireEvent.click(screen.getByText('Undo'));
      onRefresh.mockClear();

      fireEvent.click(screen.getByText('Redo'));

      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe('ACTION_TYPES constant', () => {
    it('should have correct values', () => {
      expect(ACTION_TYPES.CREATE).toBe('CREATE');
      expect(ACTION_TYPES.UPDATE).toBe('UPDATE');
      expect(ACTION_TYPES.DELETE).toBe('DELETE');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(ACTION_TYPES)).toBe(true);
    });
  });

  describe('ENTITY_TYPES constant', () => {
    it('should have correct values', () => {
      expect(ENTITY_TYPES.FOLDER).toBe('folder');
      expect(ENTITY_TYPES.ITEM).toBe('item');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(ENTITY_TYPES)).toBe(true);
    });
  });
});
