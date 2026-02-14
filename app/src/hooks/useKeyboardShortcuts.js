import { useEffect, useCallback } from 'react';

/**
 * Keyboard Shortcuts Configuration
 * =================================
 * Centralized definition of all keyboard shortcuts.
 * Format: { key, modifiers, action, description }
 */
export const KEYBOARD_SHORTCUTS = Object.freeze([
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

/**
 * Check if the user is on macOS
 * @returns {boolean} True if on macOS
 */
function isMac() {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Check if the modifier key is pressed based on platform
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {boolean} True if the platform modifier is pressed
 */
function isModifierPressed(event) {
  return isMac() ? event.metaKey : event.ctrlKey;
}

/**
 * Check if the event target is an input element
 * @param {EventTarget} target - The event target
 * @returns {boolean} True if target is an input element
 */
function isInputElement(target) {
  if (!target || !target.tagName) return false;
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
 * @param {KeyboardEvent} event - The keyboard event
 * @param {Object} shortcut - The shortcut definition
 * @returns {boolean} True if event matches the shortcut
 */
function matchesShortcut(event, shortcut) {
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
 * @param {Object} shortcut - The shortcut definition
 * @returns {string} Human-readable shortcut string
 */
export function getShortcutDisplay(shortcut) {
  const modKey = isMac() ? 'Cmd' : 'Ctrl';
  const parts = [];

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
 * @param {string} action - The action name
 * @returns {string|null} Shortcut display string or null if not found
 */
export function getShortcutForAction(action) {
  const shortcut = KEYBOARD_SHORTCUTS.find((s) => s.action === action);
  return shortcut ? getShortcutDisplay(shortcut) : null;
}

/**
 * useKeyboardShortcuts - Global keyboard shortcut handler
 *
 * WHAT: Listens for keyboard events and triggers corresponding actions.
 *
 * WHY: Provides consistent keyboard navigation throughout the app,
 *      improving accessibility and power-user experience.
 *
 * @param {Object} handlers - Object containing action handlers
 * @param {Function} handlers.openModal - Function to open a modal by name
 * @param {Function} handlers.closeAllModals - Function to close all modals
 * @param {Function} handlers.toggleSidebar - Function to toggle sidebar
 * @param {Function} handlers.focusSearch - Function to focus search input
 * @param {Object} modalState - Object containing current modal states
 */
export function useKeyboardShortcuts(handlers, modalState = {}) {
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
    const handleKeyDown = (event) => {
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
