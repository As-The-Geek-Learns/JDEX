/**
 * Appearance Settings Tab
 * =======================
 * Theme selection and appearance customization options.
 *
 * WHAT: Allows users to switch between dark, light, and system themes.
 *
 * WHY: Users have different preferences and lighting conditions.
 *      System theme option respects OS-level preferences.
 */

import type { JSX } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, THEMES, type ThemePreference } from '../../context/ThemeContext.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Props for the ThemeOption component
 */
interface ThemeOptionProps {
  label: string;
  description: string;
  icon: LucideIcon;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Theme option configuration
 */
interface ThemeOptionConfig {
  id: ThemePreference;
  label: string;
  description: string;
  icon: LucideIcon;
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Theme option card component
 */
function ThemeOption({
  label,
  description,
  icon: Icon,
  isSelected,
  onClick,
}: ThemeOptionProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left w-full
        ${
          isSelected
            ? 'border-teal-500 bg-teal-500/10'
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50 dark:border-slate-600 dark:hover:border-slate-500'
        }
      `}
      aria-pressed={isSelected}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}

      {/* Icon */}
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
        ${isSelected ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700 text-slate-400'}
      `}
      >
        <Icon size={24} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${isSelected ? 'text-teal-400' : 'text-white'}`}>{label}</div>
        <div className="text-sm text-slate-400 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Appearance Settings Component
 */
function AppearanceSettings(): JSX.Element {
  const { themePreference, setTheme } = useTheme();

  const themeOptions: ThemeOptionConfig[] = [
    {
      id: THEMES.DARK,
      label: 'Dark',
      description: 'Dark background with light text. Easy on the eyes in low light.',
      icon: Moon,
    },
    {
      id: THEMES.LIGHT,
      label: 'Light',
      description: 'Light background with dark text. Best for bright environments.',
      icon: Sun,
    },
    {
      id: THEMES.SYSTEM,
      label: 'System',
      description: 'Automatically match your operating system preference.',
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">Theme</h3>
        <p className="text-sm text-slate-400 mt-1">
          Choose how JDex looks. Your preference is saved automatically.
        </p>
      </div>

      {/* Theme Options */}
      <div className="grid gap-3">
        {themeOptions.map((option) => (
          <ThemeOption
            key={option.id}
            label={option.label}
            description={option.description}
            icon={option.icon}
            isSelected={themePreference === option.id}
            onClick={() => setTheme(option.id)}
          />
        ))}
      </div>

      {/* Info box */}
      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <p className="text-sm text-slate-400">
          <strong className="text-slate-300">Tip:</strong> Your theme preference is stored locally
          and will persist across sessions.
        </p>
      </div>
    </div>
  );
}

export default AppearanceSettings;
