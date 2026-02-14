/**
 * Command Palette Component
 * =========================
 * A searchable modal for quick access to all application actions.
 * Similar to VS Code's Command Palette (Cmd+Shift+P).
 *
 * WHAT: Provides a unified search interface for all app commands.
 *
 * WHY: Power users can quickly access any feature without
 *      navigating through menus or remembering individual shortcuts.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  FolderOpen,
  Plus,
  Settings,
  HardDrive,
  ChartColumn,
  FileEdit,
  Menu,
  Home,
  Download,
  FileText,
  X,
} from 'lucide-react';
import { getShortcutForAction } from '../../hooks/useKeyboardShortcuts.js';

/**
 * All available commands in the palette.
 * Each command has an id, label, description, icon, category, and action handler.
 */
const createCommands = (handlers) => [
  // Create commands
  {
    id: 'newFolder',
    label: 'New Folder',
    description: 'Create a new JD folder (XX.XX)',
    icon: FolderOpen,
    category: 'Create',
    action: () => handlers.openModal?.('newFolder'),
  },
  {
    id: 'newItem',
    label: 'New Item',
    description: 'Create a new item (XX.XX.XXX)',
    icon: Plus,
    category: 'Create',
    action: () => handlers.openModal?.('newItem'),
  },
  // Features
  {
    id: 'fileOrganizer',
    label: 'File Organizer',
    description: 'Organize files with rules and watch folders',
    icon: HardDrive,
    category: 'Features',
    action: () => handlers.openModal?.('fileOrganizer'),
  },
  {
    id: 'statsDashboard',
    label: 'Statistics Dashboard',
    description: 'View organization statistics and charts',
    icon: ChartColumn,
    category: 'Features',
    action: () => handlers.openModal?.('statsDashboard'),
  },
  {
    id: 'batchRename',
    label: 'Batch Rename',
    description: 'Rename multiple files at once',
    icon: FileEdit,
    category: 'Features',
    action: () => handlers.openModal?.('batchRename'),
  },
  // Navigation
  {
    id: 'goHome',
    label: 'Go to Overview',
    description: 'Navigate to the home overview',
    icon: Home,
    category: 'Navigation',
    action: () => handlers.navigateTo?.('home'),
  },
  {
    id: 'focusSearch',
    label: 'Focus Search',
    description: 'Focus the search input',
    icon: Search,
    category: 'Navigation',
    action: () => handlers.focusSearch?.(),
  },
  {
    id: 'toggleSidebar',
    label: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    icon: Menu,
    category: 'Navigation',
    action: () => handlers.toggleSidebar?.(),
  },
  // Settings & Data
  {
    id: 'settings',
    label: 'Settings',
    description: 'Open application settings',
    icon: Settings,
    category: 'Settings',
    action: () => handlers.openModal?.('settings'),
  },
  {
    id: 'exportBackup',
    label: 'Export Backup',
    description: 'Export database as SQLite backup',
    icon: Download,
    category: 'Data',
    action: () => handlers.exportDatabase?.(),
  },
  {
    id: 'exportJSON',
    label: 'Export as JSON',
    description: 'Export data as JSON file',
    icon: FileText,
    category: 'Data',
    action: () => handlers.exportJSON?.(),
  },
];

/**
 * Simple fuzzy search implementation
 * Matches if all characters in the query appear in order in the target
 */
function fuzzyMatch(query, target) {
  if (!query) return { matches: true, score: 0 };

  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  // Exact match gets highest score
  if (targetLower === queryLower) return { matches: true, score: 100 };

  // Starts with query gets high score
  if (targetLower.startsWith(queryLower)) return { matches: true, score: 90 };

  // Contains query gets medium score
  if (targetLower.includes(queryLower)) return { matches: true, score: 80 };

  // Fuzzy match: all characters must appear in order
  let queryIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;

  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else {
      consecutiveMatches = 0;
    }
  }

  if (queryIndex === queryLower.length) {
    // Score based on consecutive matches and position
    const score = 50 + maxConsecutive * 5;
    return { matches: true, score: Math.min(score, 79) };
  }

  return { matches: false, score: 0 };
}

/**
 * Filter and sort commands based on search query
 */
function filterCommands(commands, query) {
  if (!query.trim()) {
    return commands;
  }

  const results = commands
    .map((cmd) => {
      const labelMatch = fuzzyMatch(query, cmd.label);
      const descMatch = fuzzyMatch(query, cmd.description);
      const categoryMatch = fuzzyMatch(query, cmd.category);

      const bestScore = Math.max(
        labelMatch.score,
        descMatch.score * 0.8,
        categoryMatch.score * 0.6
      );

      return {
        ...cmd,
        matches: labelMatch.matches || descMatch.matches || categoryMatch.matches,
        score: bestScore,
      };
    })
    .filter((cmd) => cmd.matches)
    .sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Command Palette Modal
 */
function CommandPalette({ isOpen, onClose, handlers }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Create commands with handlers
  const commands = useMemo(() => createCommands(handlers), [handlers]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => filterCommands(commands, query), [commands, query]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after a brief delay for animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredCommands.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex];
      // scrollIntoView may not be available in test environments
      if (selectedElement?.scrollIntoView) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredCommands.length]);

  // Execute selected command
  const executeCommand = useCallback(
    (command) => {
      command.action();
      onClose();
    },
    [onClose]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, executeCommand, onClose]
  );

  if (!isOpen) return null;

  // Group commands by category for display
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  // Flatten for index tracking
  let currentIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search className="text-slate-400 flex-shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-400 text-lg"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400">No commands found</div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                {/* Category Header */}
                <div className="px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {category}
                </div>

                {/* Commands in Category */}
                {cmds.map((cmd) => {
                  currentIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  const Icon = cmd.icon;
                  const shortcut = getShortcutForAction(cmd.id);

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-teal-600/20 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                      data-index={currentIndex}
                    >
                      <Icon size={18} className={isSelected ? 'text-teal-400' : 'text-slate-400'} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{cmd.label}</div>
                        <div className="text-xs text-slate-500 truncate">{cmd.description}</div>
                      </div>
                      {shortcut && (
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">
                          {shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-500 flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">↑↓</kbd> to navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">Enter</kbd> to select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
