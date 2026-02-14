/**
 * Theme Context Tests
 * ===================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme, THEMES } from '../ThemeContext.jsx';

// Test component to access theme context
function TestComponent() {
  const { theme, themePreference, isDark, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="preference">{themePreference}</span>
      <span data-testid="isDark">{isDark ? 'true' : 'false'}</span>
      <button onClick={() => setTheme(THEMES.LIGHT)}>Set Light</button>
      <button onClick={() => setTheme(THEMES.DARK)}>Set Dark</button>
      <button onClick={() => setTheme(THEMES.SYSTEM)}>Set System</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

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

// Mock matchMedia
const createMatchMedia = (matches) => {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.matchMedia = createMatchMedia(true); // Default to dark preference
    document.documentElement.classList.remove('dark', 'light');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('THEMES constant', () => {
    it('should have correct theme values', () => {
      expect(THEMES.DARK).toBe('dark');
      expect(THEMES.LIGHT).toBe('light');
      expect(THEMES.SYSTEM).toBe('system');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(THEMES)).toBe(true);
    });
  });

  describe('ThemeProvider', () => {
    it('should provide theme context to children', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toBeInTheDocument();
      expect(screen.getByTestId('preference')).toBeInTheDocument();
    });

    it('should default to dark theme', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(screen.getByTestId('isDark').textContent).toBe('true');
    });

    it('should load theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('light');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('preference').textContent).toBe('light');
    });

    it('should apply theme class to document', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('should change theme to light', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Set Light'));

      expect(screen.getByTestId('theme').textContent).toBe('light');
      expect(screen.getByTestId('preference').textContent).toBe('light');
      expect(screen.getByTestId('isDark').textContent).toBe('false');
    });

    it('should change theme to dark', () => {
      localStorageMock.getItem.mockReturnValue('light');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Set Dark'));

      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(screen.getByTestId('isDark').textContent).toBe('true');
    });

    it('should persist theme to localStorage', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Set Light'));

      expect(localStorageMock.setItem).toHaveBeenCalledWith('jdex_theme', 'light');
    });

    it('should update document classes', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Set Light'));

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should ignore invalid theme values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      function InvalidThemeTest() {
        const { setTheme } = useTheme();
        return <button onClick={() => setTheme('invalid')}>Invalid</button>;
      }

      render(
        <ThemeProvider>
          <InvalidThemeTest />
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Invalid'));

      expect(consoleSpy).toHaveBeenCalledWith('Invalid theme: invalid');
      expect(screen.getByTestId('theme').textContent).toBe('dark');

      consoleSpy.mockRestore();
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from dark to light', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Toggle'));

      expect(screen.getByTestId('theme').textContent).toBe('light');
    });

    it('should toggle from light to dark', () => {
      localStorageMock.getItem.mockReturnValue('light');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Toggle'));

      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });
  });

  describe('system theme', () => {
    it('should use system dark preference', () => {
      window.matchMedia = createMatchMedia(true); // prefers dark

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Set System'));

      expect(screen.getByTestId('preference').textContent).toBe('system');
      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });

    it('should use system light preference', () => {
      window.matchMedia = createMatchMedia(false); // prefers light

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText('Set System'));

      expect(screen.getByTestId('preference').textContent).toBe('system');
      expect(screen.getByTestId('theme').textContent).toBe('light');
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});
