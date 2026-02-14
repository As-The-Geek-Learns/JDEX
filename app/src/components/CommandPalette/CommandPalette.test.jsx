/**
 * Command Palette Component Tests
 * ================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandPalette from './CommandPalette.jsx';

describe('CommandPalette', () => {
  const mockHandlers = {
    openModal: vi.fn(),
    navigateTo: vi.fn(),
    focusSearch: vi.fn(),
    toggleSidebar: vi.fn(),
    exportDatabase: vi.fn(),
    exportJSON: vi.fn(),
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    handlers: mockHandlers,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render when isOpen is true', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<CommandPalette {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
    });

    it('should render command list', () => {
      render(<CommandPalette {...defaultProps} />);

      // Should have some commands visible
      expect(screen.getByText('New Folder')).toBeInTheDocument();
      expect(screen.getByText('New Item')).toBeInTheDocument();
      // "Settings" appears both as category header and command - check for multiple
      expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
    });

    it('should render category headers', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('should render keyboard hints in footer', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByText(/to navigate/i)).toBeInTheDocument();
      expect(screen.getByText(/to select/i)).toBeInTheDocument();
      expect(screen.getByText(/to close/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Search Filtering
  // ===========================================================================

  describe('search filtering', () => {
    it('should filter commands based on search query', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'folder');

      // Should show New Folder
      expect(screen.getByText('New Folder')).toBeInTheDocument();
      // Should not show Settings
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should show "No commands found" when no matches', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'xyznonexistent');

      expect(screen.getByText('No commands found')).toBeInTheDocument();
    });

    it('should search by description', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'SQLite');

      // Should find export backup which has "SQLite" in description
      expect(screen.getByText('Export Backup')).toBeInTheDocument();
    });

    it('should search by category', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'data');

      // Should find export commands which are in Data category
      expect(screen.getByText('Export Backup')).toBeInTheDocument();
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });

    it('should perform fuzzy matching', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'nf'); // Should match "New Folder"

      expect(screen.getByText('New Folder')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Command Execution
  // ===========================================================================

  describe('command execution', () => {
    it('should execute command on click', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const newFolderButton = screen.getByText('New Folder').closest('button');
      await user.click(newFolderButton);

      expect(mockHandlers.openModal).toHaveBeenCalledWith('newFolder');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should execute command on Enter', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, '{Enter}');

      // First command (New Folder) should be executed
      expect(mockHandlers.openModal).toHaveBeenCalledWith('newFolder');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should execute settings command', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'settings{Enter}');

      expect(mockHandlers.openModal).toHaveBeenCalledWith('settings');
    });

    it('should execute navigation command', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'overview{Enter}');

      expect(mockHandlers.navigateTo).toHaveBeenCalledWith('home');
    });

    it('should execute focus search command', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'focus search{Enter}');

      expect(mockHandlers.focusSearch).toHaveBeenCalled();
    });

    it('should execute toggle sidebar command', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'sidebar{Enter}');

      expect(mockHandlers.toggleSidebar).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Keyboard Navigation
  // ===========================================================================

  describe('keyboard navigation', () => {
    it('should navigate down with ArrowDown', async () => {
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);

      // Press down to move selection
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Execute command - should be the second one (New Item)
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockHandlers.openModal).toHaveBeenCalledWith('newItem');
    });

    it('should navigate up with ArrowUp', async () => {
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);

      // Go down twice, then up once
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      // Execute command - should be the second one (New Item)
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockHandlers.openModal).toHaveBeenCalledWith('newItem');
    });

    it('should not go below last item', async () => {
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);

      // Press down many times
      for (let i = 0; i < 20; i++) {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
      }

      // Should still be able to execute last command
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should not go above first item', async () => {
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      // Execute command - should still be the first one (New Folder)
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockHandlers.openModal).toHaveBeenCalledWith('newFolder');
    });
  });

  // ===========================================================================
  // Close Behavior
  // ===========================================================================

  describe('close behavior', () => {
    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, '{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should close on backdrop click', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should close on close button click', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should not close when clicking inside modal', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.click(input);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Keyboard Shortcuts Display
  // ===========================================================================

  describe('keyboard shortcuts display', () => {
    it('should display keyboard shortcuts for commands', () => {
      render(<CommandPalette {...defaultProps} />);

      // Commands with shortcuts should display them
      // The exact format depends on platform, so we check for existence
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getAllByText(/Cmd|Ctrl/i).length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // State Reset
  // ===========================================================================

  describe('state reset', () => {
    it('should reset search when reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, 'folder');

      // Close and reopen
      rerender(<CommandPalette {...defaultProps} isOpen={false} />);
      rerender(<CommandPalette {...defaultProps} isOpen={true} />);

      const newInput = screen.getByPlaceholderText(/type a command/i);
      expect(newInput).toHaveValue('');
    });

    it('should reset selection when reopened', async () => {
      const { rerender } = render(<CommandPalette {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a command/i);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Close and reopen
      rerender(<CommandPalette {...defaultProps} isOpen={false} />);
      rerender(<CommandPalette {...defaultProps} isOpen={true} />);

      // First item should be selected again - verify by pressing Enter and checking first command executed
      const newInput = screen.getByPlaceholderText(/type a command/i);
      fireEvent.keyDown(newInput, { key: 'Enter' });
      expect(mockHandlers.openModal).toHaveBeenCalledWith('newFolder');
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('accessibility', () => {
    it('should have dialog role', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-label', () => {
      render(<CommandPalette {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Command Palette');
    });

    it('should focus input on open', async () => {
      render(<CommandPalette {...defaultProps} />);

      // Wait for focus (happens with setTimeout)
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getByPlaceholderText(/type a command/i)).toHaveFocus();
    });
  });

  // ===========================================================================
  // Mouse Interaction
  // ===========================================================================

  describe('mouse interaction', () => {
    it('should highlight command on hover and execute', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      // Get command buttons by data-index attribute
      const commandButtons = screen
        .getAllByRole('button')
        .filter((b) => b.hasAttribute('data-index'));

      // Hover over the third command button (File Organizer, index 2)
      await user.hover(commandButtons[2]);

      // Click to execute and verify the correct command
      await user.click(commandButtons[2]);
      expect(mockHandlers.openModal).toHaveBeenCalledWith('fileOrganizer');
    });
  });
});
