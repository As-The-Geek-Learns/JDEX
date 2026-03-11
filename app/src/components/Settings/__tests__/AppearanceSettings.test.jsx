/**
 * Appearance Settings Tests
 * =========================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppearanceSettings from '../AppearanceSettings.jsx';
import { ThemeProvider } from '../../../context/ThemeContext.jsx';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Mock matchMedia
const createMatchMedia = (matches) =>
  vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

// Render with ThemeProvider
function renderWithTheme(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AppearanceSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.matchMedia = createMatchMedia(true);
    document.documentElement.classList.remove('dark', 'light');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render theme section header', () => {
      renderWithTheme(<AppearanceSettings />);

      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText(/Choose how JDex looks/i)).toBeInTheDocument();
    });

    it('should render all theme options', () => {
      renderWithTheme(<AppearanceSettings />);

      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should render theme descriptions', () => {
      renderWithTheme(<AppearanceSettings />);

      expect(screen.getByText(/Dark background with light text/i)).toBeInTheDocument();
      expect(screen.getByText(/Light background with dark text/i)).toBeInTheDocument();
      expect(screen.getByText(/Automatically match your operating system/i)).toBeInTheDocument();
    });

    it('should render tip box', () => {
      renderWithTheme(<AppearanceSettings />);

      expect(screen.getByText(/Tip:/i)).toBeInTheDocument();
      expect(screen.getByText(/stored locally/i)).toBeInTheDocument();
    });

    it('should show dark theme as selected by default', () => {
      renderWithTheme(<AppearanceSettings />);

      const darkButton = screen.getByText('Dark').closest('button');
      expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('theme selection', () => {
    it('should select light theme when clicked', () => {
      renderWithTheme(<AppearanceSettings />);

      const lightButton = screen.getByText('Light').closest('button');
      fireEvent.click(lightButton);

      expect(lightButton).toHaveAttribute('aria-pressed', 'true');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('should select dark theme when clicked', () => {
      localStorageMock.getItem.mockReturnValue('light');
      renderWithTheme(<AppearanceSettings />);

      const darkButton = screen.getByText('Dark').closest('button');
      fireEvent.click(darkButton);

      expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should select system theme when clicked', () => {
      renderWithTheme(<AppearanceSettings />);

      const systemButton = screen.getByText('System').closest('button');
      fireEvent.click(systemButton);

      expect(systemButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should persist theme selection to localStorage', () => {
      renderWithTheme(<AppearanceSettings />);

      const lightButton = screen.getByText('Light').closest('button');
      fireEvent.click(lightButton);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('jdex_theme', 'light');
    });

    it('should update visual selection indicator', () => {
      renderWithTheme(<AppearanceSettings />);

      // Initially dark is selected
      let darkButton = screen.getByText('Dark').closest('button');
      expect(darkButton.className).toContain('border-teal-500');

      // Click light
      const lightButton = screen.getByText('Light').closest('button');
      fireEvent.click(lightButton);

      // Light should now have selection styling
      expect(lightButton.className).toContain('border-teal-500');

      // Dark should not have selection styling
      darkButton = screen.getByText('Dark').closest('button');
      expect(darkButton.className).not.toContain('border-teal-500');
    });
  });

  describe('accessibility', () => {
    it('should have aria-pressed on theme buttons', () => {
      renderWithTheme(<AppearanceSettings />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });

    it('should be keyboard accessible', () => {
      renderWithTheme(<AppearanceSettings />);

      const lightButton = screen.getByText('Light').closest('button');
      lightButton.focus();
      fireEvent.keyDown(lightButton, { key: 'Enter' });

      // Button should be focusable and clickable
      expect(document.activeElement).toBe(lightButton);
    });
  });
});
