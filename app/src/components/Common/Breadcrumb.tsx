/**
 * Breadcrumb Component
 * ====================
 * Navigation breadcrumb trail.
 *
 * WHAT: Shows navigation path with clickable items.
 * WHY: Provides context and quick navigation within hierarchy.
 */

import type { JSX } from 'react';
import { Fragment } from 'react';
import { Home, ChevronRight } from 'lucide-react';
import type { Area, Category, Folder } from '../../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * View type for navigation
 */
type ViewType = 'home' | 'area' | 'category' | 'folder' | 'search';

/**
 * Breadcrumb path item
 */
export interface BreadcrumbItem {
  type: ViewType;
  label: string;
  data?: Area | Category | Folder | null;
}

/**
 * Props for Breadcrumb component.
 */
export interface BreadcrumbProps {
  path: BreadcrumbItem[];
  onNavigate: (view: ViewType, data?: Area | Category | Folder | null) => void;
}

// =============================================================================
// Component
// =============================================================================

function Breadcrumb({ path, onNavigate }: BreadcrumbProps): JSX.Element {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={() => onNavigate('home')}
        className="text-slate-400 hover:text-teal-400 transition-colors"
      >
        <Home size={16} />
      </button>
      {path.map((item, index) => (
        <Fragment key={index}>
          <ChevronRight size={14} className="text-slate-600" />
          <button
            onClick={() => onNavigate(item.type, item.data)}
            className={`transition-colors ${
              index === path.length - 1
                ? 'text-teal-400 font-medium'
                : 'text-slate-400 hover:text-teal-400'
            }`}
          >
            {item.label}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumb;
