/**
 * Theme Context
 * =============
 * Manages application theme (light/dark) with localStorage persistence.
 *
 * WHAT: Provides theme state and toggle functionality across the app.
 *
 * WHY: Users may prefer light mode in bright environments. Persisting
 *      the preference ensures a consistent experience across sessions.
 */

import type { ReactNode, JSX } from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Theme values
 */
export type ThemeValue = 'dark' | 'light';

/**
 * Theme preference (includes 'system' option)
 */
export type ThemePreference = ThemeValue | 'system';

/**
 * Theme constants object type
 */
export interface ThemeConstants {
  readonly DARK: 'dark';
  readonly LIGHT: 'light';
  readonly SYSTEM: 'system';
}

/**
 * Context value for theme operations.
 */
export interface ThemeContextValue {
  theme: ThemeValue;
  themePreference: ThemePreference;
  isDark: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  THEMES: ThemeConstants;
}

/**
 * Props for the ThemeProvider component.
 */
export interface ThemeProviderProps {
  children: ReactNode;
}

// ============================================
// CONSTANTS
// ============================================

const THEME_STORAGE_KEY = 'jdex_theme';

export const THEMES: ThemeConstants = Object.freeze({
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Detect system theme preference
 */
function getSystemTheme(): ThemeValue {
  if (typeof window === 'undefined') return THEMES.DARK;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
}

/**
 * Get stored theme or default
 */
function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return THEMES.DARK;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (Object.values(THEMES) as string[]).includes(stored)) {
      return stored as ThemePreference;
    }
  } catch (_e) {
    // localStorage not available
  }
  return THEMES.DARK;
}

/**
 * Resolve actual theme from preference
 */
function resolveTheme(preference: ThemePreference): ThemeValue {
  if (preference === THEMES.SYSTEM) {
    return getSystemTheme();
  }
  return preference;
}

/**
 * Apply theme to document
 */
function applyTheme(theme: ThemeValue): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Remove both classes, then add the correct one
  root.classList.remove('dark', 'light');
  root.classList.add(theme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
  }
}

// ============================================
// CONTEXT
// ============================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  // Theme preference (what user selected)
  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredTheme);

  // Resolved theme (actual dark/light)
  const [resolvedTheme, setResolvedTheme] = useState<ThemeValue>(() =>
    resolveTheme(getStoredTheme())
  );

  // Update resolved theme when preference changes
  useEffect(() => {
    const resolved = resolveTheme(themePreference);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [themePreference]);

  // Listen for system theme changes when using 'system' preference
  useEffect(() => {
    if (themePreference !== THEMES.SYSTEM) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent): void => {
      const newTheme: ThemeValue = e.matches ? THEMES.DARK : THEMES.LIGHT;
      setResolvedTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Set theme preference
  const setTheme = useCallback((newTheme: ThemePreference): void => {
    if (!(Object.values(THEMES) as string[]).includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}`);
      return;
    }

    setThemePreference(newTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (_e) {
      // localStorage not available
    }
  }, []);

  // Toggle between dark and light
  const toggleTheme = useCallback((): void => {
    const newTheme: ThemeValue = resolvedTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Check if dark mode
  const isDark = resolvedTheme === THEMES.DARK;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolvedTheme,
      themePreference,
      isDark,
      setTheme,
      toggleTheme,
      THEMES,
    }),
    [resolvedTheme, themePreference, isDark, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to use theme context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
