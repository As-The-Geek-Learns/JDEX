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

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const THEME_STORAGE_KEY = 'jdex_theme';
const THEMES = Object.freeze({
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
});

/**
 * Detect system theme preference
 * @returns {'dark' | 'light'} The system theme
 */
function getSystemTheme() {
  if (typeof window === 'undefined') return THEMES.DARK;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
}

/**
 * Get stored theme or default
 * @returns {string} The stored theme or 'dark' default
 */
function getStoredTheme() {
  if (typeof window === 'undefined') return THEMES.DARK;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && Object.values(THEMES).includes(stored)) {
      return stored;
    }
  } catch (_e) {
    // localStorage not available
  }
  return THEMES.DARK;
}

/**
 * Resolve actual theme from preference
 * @param {string} preference - The theme preference ('dark', 'light', or 'system')
 * @returns {'dark' | 'light'} The resolved theme
 */
function resolveTheme(preference) {
  if (preference === THEMES.SYSTEM) {
    return getSystemTheme();
  }
  return preference;
}

/**
 * Apply theme to document
 * @param {'dark' | 'light'} theme - The theme to apply
 */
function applyTheme(theme) {
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

// Context
const ThemeContext = createContext(null);

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }) {
  // Theme preference (what user selected)
  const [themePreference, setThemePreference] = useState(getStoredTheme);

  // Resolved theme (actual dark/light)
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(getStoredTheme()));

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

    const handleChange = (e) => {
      const newTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
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
  const setTheme = useCallback((newTheme) => {
    if (!Object.values(THEMES).includes(newTheme)) {
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
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Check if dark mode
  const isDark = resolvedTheme === THEMES.DARK;

  const value = useMemo(
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

/**
 * Hook to use theme context
 * @returns {Object} Theme context value
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { THEMES };
export default ThemeContext;
