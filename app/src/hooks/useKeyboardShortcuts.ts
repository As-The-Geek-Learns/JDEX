import { useEffect, useCallback } from 'react';
import type { ModalName } from './useModalState.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Modifier keys for shortcuts.
 */
export type ModifierKey = 'mod' | 'shift' | 'alt';

/**
 * Keyboard shortcut action names.
 */
export type ShortcutAction =
  | 'newFolder'
  | 'newItem'
  | 'settings'
  | 'fileOrganizer'
  | 'statsDashboard'
  | 'batchRename'
  | 'commandPalette'
  | 'focusSearch'
  | 'toggleSidebar'
  | 'closeModal'
  | 'undo'
  | 'redo';

/**
 * Keyboard shortcut definition.
 */
export interface KeyboardShortcut {
  key: string;
  modifiers: ModifierKey[];
  action: ShortcutAction;
  description: string;
  allowInInput?: boolean;
}

/**
 * Modal state for checking if modals are open.
 */
export interface ModalStateForShortcuts {
  showNewFolderModal?: boolean;
  showNewItemModal?: boolean;
  showSettings?: boolean;
  showFileOrganizer?: boolean;
  showStatsDashboard?: boolean;
  showBatchRename?: boolean;
  showCommandPalette?: boolean;
}

/**
 * Handlers for keyboard shortcut actions.
 */
export interface ShortcutHandlers {
  openModal?: (modalName: ModalName) => void;
  closeAllModals?: () => void;
  toggleSidebar?: () => void;
  focusSearch?: () => void;
  openCommandPalette?: () => void;
  undo?: () => void;
  redo?: () => void;
}

// ============================================
// KEYBOARD SHORTCUTS CONFIGURATION
// ============================================

/**
 * Centralized definition of all keyboard shortcuts.
 */
export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = Object.freeze([
  // Modal shortcuts
  {
    key: 'n',
    modifiers: ['mod', 'shift'],
    action: 'newFolder',
    description: 'New Folder',
  },
  {
    key: 'n',
    modifiers: ['mod'],
    action: 'newItem',
    description: 'New Item',
  },
  {
    key: ',',
    modifiers: ['mod'],
    action: 'settings',
    description: 'Settings',
  },
  {
    key: 'o',
    modifiers: ['mod', 'shift'],
    action: 'fileOrganizer',
    description: 'File Organizer',
  },
  {
    key: 's',
    modifiers: ['mod', 'shift'],
    action: 'statsDashboard',
    description: 'Statistics',
  },
  {
    key: 'r',
    modifiers: ['mod', 'shift'],
    action: 'batchRename',
    description: 'Batch Rename',
  },
  // Command palette
  {
    key: 'p',
    modifiers: ['mod', 'shift'],
    action: 'commandPalette',
    description: 'Command Palette',
    allowInInput: true,
  },
  // Navigation shortcuts
  {
    key: 'k',
    modifiers: ['mod'],
    action: 'focusSearch',
    description: 'Focus Search',
  },
  {
    key: 'b',
    modifiers: ['mod'],
    action: 'toggleSidebar',
    description: 'Toggle Sidebar',
  },
  // Always-available shortcuts (work even in inputs)
  {
    key: 'Escape',
    modifiers: [],
    action: 'closeModal',
    description: 'Close Modal',
    allowInInput: true,
  },
  // Undo/Redo shortcuts
  {
    key: 'z',
    modifiers: ['mod'],
    action: 'undo',
    description: 'Undo',
    allowInInput: true,
  },
  {
    key: 'z',
    modifiers: ['mod', 'shift'],
    action: 'redo',
    description: 'Redo',
    allowInInput: true,
  },
]);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if the user is on macOS
 */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Check if the modifier key is pressed based on platform
 */
function isModifierPressed(event: KeyboardEvent): boolean {
  return isMac() ? event.metaKey : event.ctrlKey;
}

/**
 * Check if the event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toUpperCase();
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Check if event matches a shortcut definition
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  // Check key (case-insensitive for letters)
  const eventKey = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  if (eventKey !== shortcutKey) return false;

  // Check modifiers
  const needsMod = shortcut.modifiers.includes('mod');
  const needsShift = shortcut.modifiers.includes('shift');
  const needsAlt = shortcut.modifiers.includes('alt');

  const hasCorrectMod = needsMod ? isModifierPressed(event) : !isModifierPressed(event);
  const hasCorrectShift = needsShift ? event.shiftKey : !event.shiftKey;
  const hasCorrectAlt = needsAlt ? event.altKey : !event.altKey;

  return hasCorrectMod && hasCorrectShift && hasCorrectAlt;
}

/**
 * Get the display string for a shortcut (e.g., "Cmd+Shift+N" or "Ctrl+Shift+N")
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const modKey = isMac() ? 'Cmd' : 'Ctrl';
  const parts: string[] = [];

  if (shortcut.modifiers.includes('mod')) {
    parts.push(modKey);
  }
  if (shortcut.modifiers.includes('shift')) {
    parts.push('Shift');
  }
  if (shortcut.modifiers.includes('alt')) {
    parts.push(isMac() ? 'Option' : 'Alt');
  }

  // Format the key
  let keyDisplay = shortcut.key.toUpperCase();
  if (shortcut.key === ',') keyDisplay = ',';
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';

  parts.push(keyDisplay);
  return parts.join('+');
}

/**
 * Get shortcut display for a specific action
 */
export function getShortcutForAction(action: ShortcutAction): string | null {
  const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === action);
  return shortcut ? getShortcutDisplay(shortcut) : null;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * useKeyboardShortcuts - Global keyboard shortcut handler
 *
 * WHAT: Listens for keyboard events and triggers corresponding actions.
 *
 * WHY: Provides consistent keyboard navigation throughout the app,
 *      improving accessibility and power-user experience.
 */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  modalState: ModalStateForShortcuts = {}
): void {
  const { openModal, closeAllModals, toggleSidebar, focusSearch, openCommandPalette, undo, redo } =
    handlers;

  // Check if any modal is currently open (excluding command palette)
  const isAnyModalOpen = useCallback(() => {
    return (
      modalState.showNewFolderModal ||
      modalState.showNewItemModal ||
      modalState.showSettings ||
      modalState.showFileOrganizer ||
      modalState.showStatsDashboard ||
      modalState.showBatchRename ||
      modalState.showCommandPalette ||
      false
    );
  }, [modalState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const targetIsInput = isInputElement(event.target);

      // Find matching shortcut
      for (const shortcut of KEYBOARD_SHORTCUTS) {
        if (!matchesShortcut(event, shortcut)) continue;

        // Skip if in input and shortcut doesn't allow it
        if (targetIsInput && !shortcut.allowInInput) continue;

        // Handle the action
        switch (shortcut.action) {
          case 'newFolder':
            if (!isAnyModalOpen()) {
              event.preventDefault();
              openModal?.('newFolder');
            }
            break;

          case 'newItem':
            if (!isAnyModalOpen()) {
              event.preventDefault();
              openModal?.('newItem');
            }
            break;

          case 'settings':
            if (!isAnyModalOpen()) {
              event.preventDefault();
              openModal?.('settings');
            }
            break;

          case 'fileOrganizer':
            if (!isAnyModalOpen()) {
              event.preventDefault();
              openModal?.('fileOrganizer');
            }
            break;

          case 'statsDashboard':
            if (!isAnyModalOpen()) {
              event.preventDefault();
              openModal?.('statsDashboard');
            }
            break;

          case 'batchRename':
            if (!isAnyModalOpen()) {
              event.preventDefault();
              openModal?.('batchRename');
            }
            break;

          case 'commandPalette':
            event.preventDefault();
            openCommandPalette?.();
            break;

          case 'focusSearch':
            event.preventDefault();
            closeAllModals?.();
            focusSearch?.();
            break;

          case 'toggleSidebar':
            event.preventDefault();
            toggleSidebar?.();
            break;

          case 'closeModal':
            if (isAnyModalOpen()) {
              event.preventDefault();
              closeAllModals?.();
            }
            break;

          case 'undo':
            event.preventDefault();
            undo?.();
            break;

          case 'redo':
            event.preventDefault();
            redo?.();
            break;
        }

        // Only handle first matching shortcut
        break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openModal,
    closeAllModals,
    toggleSidebar,
    focusSearch,
    openCommandPalette,
    undo,
    redo,
    isAnyModalOpen,
  ]);
}

export default useKeyboardShortcuts;
