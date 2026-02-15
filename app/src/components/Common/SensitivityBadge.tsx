/**
 * SensitivityBadge Component
 * ==========================
 * Displays a badge indicating sensitivity level.
 *
 * WHAT: Visual badge for sensitivity classification.
 * WHY: Provides quick visual identification of content sensitivity.
 */

import type { JSX } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Cloud, Lock, Briefcase, FolderTree } from 'lucide-react';
import type { Sensitivity } from '../../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

type SensitivityKey = Sensitivity | 'inherit';

interface BadgeConfig {
  label: string;
  class: string;
  icon: LucideIcon;
}

/**
 * Props for SensitivityBadge component.
 */
export interface SensitivityBadgeProps {
  sensitivity?: SensitivityKey;
  isInherited?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const CONFIG: Record<SensitivityKey, BadgeConfig> = {
  standard: {
    label: 'Standard',
    class: 'bg-gradient-to-r from-slate-600/30 to-slate-700/20 text-slate-300 border-slate-500/30',
    icon: Cloud,
  },
  sensitive: {
    label: 'Sensitive',
    class: 'bg-gradient-to-r from-red-500/20 to-red-600/10 text-red-400 border-red-500/30',
    icon: Lock,
  },
  work: {
    label: 'Work',
    class: 'bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
    icon: Briefcase,
  },
  inherit: {
    label: 'Inherit',
    class:
      'bg-gradient-to-r from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30',
    icon: FolderTree,
  },
};

// =============================================================================
// Component
// =============================================================================

function SensitivityBadge({
  sensitivity,
  isInherited = false,
}: SensitivityBadgeProps): JSX.Element {
  const {
    label,
    class: className,
    icon: Icon,
  } = CONFIG[sensitivity || 'standard'] || CONFIG.standard;

  return (
    <span
      className={`${className} px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 border`}
    >
      <Icon size={10} />
      {isInherited ? `(${label})` : label}
    </span>
  );
}

export default SensitivityBadge;
