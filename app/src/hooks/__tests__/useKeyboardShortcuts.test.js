/**
 * Keyboard Shortcuts Hook Tests
 * ==============================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  KEYBOARD_SHORTCUTS,
  getShortcutDisplay,
  getShortcutForAction,
  useKeyboardShortcuts,
} from '../useKeyboardShortcuts.js';

// Mock navigator.platform for cross-platform testing
const mockNavigator = (platform) => {
  Object.defineProperty(navigator, 'platform', {
    value: platform,
    writable: true,
    configurable: true,
  });
};

describe('KEYBOARD_SHORTCUTS constant', () => {
  it('is a frozen array', () => {
    expect(Array.isArray(KEYBOARD_SHORTCUTS)).toBe(true);
    expect(Object.isFrozen(KEYBOARD_SHORTCUTS)).toBe(true);
  });

  it('contains all expected shortcuts', () => {
    const actions = KEYBOARD_SHORTCUTS.map((s) => s.action);
    expect(actions).toContain('newFolder');
    expect(actions).toContain('newItem');
    expect(actions).toContain('settings');
    expect(actions).toContain('fileOrganizer');
    expect(actions).toContain('statsDashboard');
    expect(actions).toContain('batchRename');
    expect(actions).toContain('commandPalette');
    expect(actions).toContain('focusSearch');
    expect(actions).toContain('toggleSidebar');
    expect(actions).toContain('closeModal');
  });

  it('command palette allows input', () => {
    const paletteShortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'commandPalette');
    expect(paletteShortcut.key).toBe('p');
    expect(paletteShortcut.modifiers).toContain('mod');
    expect(paletteShortcut.modifiers).toContain('shift');
    expect(paletteShortcut.allowInInput).toBe(true);
  });

  it('each shortcut has required properties', () => {
    KEYBOARD_SHORTCUTS.forEach((shortcut) => {
      expect(shortcut).toHaveProperty('key');
      expect(shortcut).toHaveProperty('modifiers');
      expect(shortcut).toHaveProperty('action');
      expect(shortcut).toHaveProperty('description');
      expect(Array.isArray(shortcut.modifiers)).toBe(true);
    });
  });

  it('escape key allows input', () => {
    const escapeShortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'closeModal');
    expect(escapeShortcut.key).toBe('Escape');
    expect(escapeShortcut.allowInInput).toBe(true);
  });
});

describe('getShortcutDisplay', () => {
  describe('on macOS', () => {
    beforeEach(() => {
      mockNavigator('MacIntel');
    });

    it('returns Cmd+N for newItem shortcut', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'newItem');
      expect(getShortcutDisplay(shortcut)).toBe('Cmd+N');
    });

    it('returns Cmd+Shift+N for newFolder shortcut', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'newFolder');
      expect(getShortcutDisplay(shortcut)).toBe('Cmd+Shift+N');
    });

    it('returns Cmd+K for focusSearch shortcut', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'focusSearch');
      expect(getShortcutDisplay(shortcut)).toBe('Cmd+K');
    });

    it('returns Cmd+, for settings shortcut', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'settings');
      expect(getShortcutDisplay(shortcut)).toBe('Cmd+,');
    });

    it('returns Esc for closeModal shortcut', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'closeModal');
      expect(getShortcutDisplay(shortcut)).toBe('Esc');
    });
  });

  describe('on Windows/Linux', () => {
    beforeEach(() => {
      mockNavigator('Win32');
    });

    it('returns Ctrl+N for newItem shortcut', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'newItem');
      expect(getShortcutDisplay(shortcut)).toBe('Ctrl+N');
    });

    it('returns Ctrl+Shift+N for newFolder shortcut', () => {
      const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === 'newFolder');
      expect(getShortcutDisplay(shortcut)).toBe('Ctrl+Shift+N');
    });
  });
});

describe('getShortcutForAction', () => {
  beforeEach(() => {
    mockNavigator('MacIntel');
  });

  it('returns shortcut display for valid action', () => {
    expect(getShortcutForAction('newItem')).toBe('Cmd+N');
    expect(getShortcutForAction('newFolder')).toBe('Cmd+Shift+N');
    expect(getShortcutForAction('settings')).toBe('Cmd+,');
  });

  it('returns null for invalid action', () => {
    expect(getShortcutForAction('invalidAction')).toBeNull();
    expect(getShortcutForAction('')).toBeNull();
    expect(getShortcutForAction(null)).toBeNull();
  });
});

describe('useKeyboardShortcuts hook', () => {
  let handlers;
  let modalState;
  let keydownHandler;

  beforeEach(() => {
    mockNavigator('MacIntel');

    handlers = {
      openModal: vi.fn(),
      closeAllModals: vi.fn(),
      toggleSidebar: vi.fn(),
      focusSearch: vi.fn(),
      openCommandPalette: vi.fn(),
    };

    modalState = {
      showNewFolderModal: false,
      showNewItemModal: false,
      showSettings: false,
      showFileOrganizer: false,
      showStatsDashboard: false,
      showBatchRename: false,
      showCommandPalette: false,
    };

    // Capture the event listener
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler;
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createKeyEvent = (key, options = {}) => ({
    key,
    metaKey: options.meta || false,
    ctrlKey: options.ctrl || false,
    shiftKey: options.shift || false,
    altKey: options.alt || false,
    target: options.target || document.body,
    preventDefault: vi.fn(),
  });

  it('registers keydown event listener on mount', () => {
    renderHook(() => useKeyboardShortcuts(handlers, modalState));
    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('removes event listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers, modalState));
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  describe('modal shortcuts', () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts(handlers, modalState));
    });

    it('opens new item modal with Cmd+N', () => {
      const event = createKeyEvent('n', { meta: true });
      keydownHandler(event);

      expect(handlers.openModal).toHaveBeenCalledWith('newItem');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('opens new folder modal with Cmd+Shift+N', () => {
      const event = createKeyEvent('n', { meta: true, shift: true });
      keydownHandler(event);

      expect(handlers.openModal).toHaveBeenCalledWith('newFolder');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('opens settings modal with Cmd+,', () => {
      const event = createKeyEvent(',', { meta: true });
      keydownHandler(event);

      expect(handlers.openModal).toHaveBeenCalledWith('settings');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('opens file organizer with Cmd+Shift+O', () => {
      const event = createKeyEvent('o', { meta: true, shift: true });
      keydownHandler(event);

      expect(handlers.openModal).toHaveBeenCalledWith('fileOrganizer');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('opens stats dashboard with Cmd+Shift+S', () => {
      const event = createKeyEvent('s', { meta: true, shift: true });
      keydownHandler(event);

      expect(handlers.openModal).toHaveBeenCalledWith('statsDashboard');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('opens batch rename with Cmd+Shift+R', () => {
      const event = createKeyEvent('r', { meta: true, shift: true });
      keydownHandler(event);

      expect(handlers.openModal).toHaveBeenCalledWith('batchRename');
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('navigation shortcuts', () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts(handlers, modalState));
    });

    it('opens command palette with Cmd+Shift+P', () => {
      const event = createKeyEvent('p', { meta: true, shift: true });
      keydownHandler(event);

      expect(handlers.openCommandPalette).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('focuses search with Cmd+K', () => {
      const event = createKeyEvent('k', { meta: true });
      keydownHandler(event);

      expect(handlers.closeAllModals).toHaveBeenCalled();
      expect(handlers.focusSearch).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('toggles sidebar with Cmd+B', () => {
      const event = createKeyEvent('b', { meta: true });
      keydownHandler(event);

      expect(handlers.toggleSidebar).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('command palette', () => {
    it('opens command palette even from input elements', () => {
      renderHook(() => useKeyboardShortcuts(handlers, modalState));

      const input = document.createElement('input');
      const event = createKeyEvent('p', { meta: true, shift: true, target: input });
      keydownHandler(event);

      expect(handlers.openCommandPalette).toHaveBeenCalled();
    });
  });

  describe('escape key', () => {
    it('closes modals when a modal is open', () => {
      const openModalState = { ...modalState, showSettings: true };
      renderHook(() => useKeyboardShortcuts(handlers, openModalState));

      const event = createKeyEvent('Escape');
      keydownHandler(event);

      expect(handlers.closeAllModals).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('does not call closeAllModals when no modal is open', () => {
      renderHook(() => useKeyboardShortcuts(handlers, modalState));

      const event = createKeyEvent('Escape');
      keydownHandler(event);

      expect(handlers.closeAllModals).not.toHaveBeenCalled();
    });

    it('works in input elements', () => {
      const openModalState = { ...modalState, showSettings: true };
      renderHook(() => useKeyboardShortcuts(handlers, openModalState));

      const input = document.createElement('input');
      const event = createKeyEvent('Escape', { target: input });
      keydownHandler(event);

      expect(handlers.closeAllModals).toHaveBeenCalled();
    });
  });

  describe('input element behavior', () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts(handlers, modalState));
    });

    it('ignores shortcuts in input elements', () => {
      const input = document.createElement('input');
      const event = createKeyEvent('n', { meta: true, target: input });
      keydownHandler(event);

      expect(handlers.openModal).not.toHaveBeenCalled();
    });

    it('ignores shortcuts in textarea elements', () => {
      const textarea = document.createElement('textarea');
      const event = createKeyEvent('n', { meta: true, target: textarea });
      keydownHandler(event);

      expect(handlers.openModal).not.toHaveBeenCalled();
    });

    it('ignores shortcuts in contenteditable elements', () => {
      const div = document.createElement('div');
      div.isContentEditable = true;
      const event = createKeyEvent('n', { meta: true, target: div });
      keydownHandler(event);

      expect(handlers.openModal).not.toHaveBeenCalled();
    });
  });

  describe('modal open state', () => {
    it('does not open modal shortcuts when a modal is already open', () => {
      const openModalState = { ...modalState, showSettings: true };
      renderHook(() => useKeyboardShortcuts(handlers, openModalState));

      const event = createKeyEvent('n', { meta: true });
      keydownHandler(event);

      expect(handlers.openModal).not.toHaveBeenCalled();
    });
  });

  describe('Windows/Linux support', () => {
    beforeEach(() => {
      mockNavigator('Win32');
    });

    it('uses Ctrl instead of Meta on Windows', () => {
      renderHook(() => useKeyboardShortcuts(handlers, modalState));

      const event = createKeyEvent('n', { ctrl: true });
      keydownHandler(event);

      expect(handlers.openModal).toHaveBeenCalledWith('newItem');
    });

    it('ignores Meta key on Windows', () => {
      renderHook(() => useKeyboardShortcuts(handlers, modalState));

      const event = createKeyEvent('n', { meta: true });
      keydownHandler(event);

      expect(handlers.openModal).not.toHaveBeenCalled();
    });
  });

  describe('handler safety', () => {
    it('handles missing openModal gracefully', () => {
      const partialHandlers = { ...handlers, openModal: undefined };
      renderHook(() => useKeyboardShortcuts(partialHandlers, modalState));

      const event = createKeyEvent('n', { meta: true });
      expect(() => keydownHandler(event)).not.toThrow();
    });

    it('handles missing focusSearch gracefully', () => {
      const partialHandlers = { ...handlers, focusSearch: undefined };
      renderHook(() => useKeyboardShortcuts(partialHandlers, modalState));

      const event = createKeyEvent('k', { meta: true });
      expect(() => keydownHandler(event)).not.toThrow();
    });
  });
});
