/**
 * CategoryTree Component
 * ======================
 * Hierarchical navigation tree for areas and categories.
 *
 * WHAT: Expandable tree view of JD hierarchy.
 * WHY: Provides intuitive navigation through areas and categories.
 */

import type { JSX, MouseEvent } from 'react';
import { useState, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  Home,
  FileText,
  Briefcase,
  Code,
  Heart,
  BookOpen,
  Archive,
  Database,
} from 'lucide-react';
import type { Area, Category } from '../../types/index.js';

/**
 * Props for CategoryTree component.
 */
export interface CategoryTreeProps {
  areas: Area[];
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  onSelectArea: (area: Area) => void;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Area icon mapping
 */
const AREA_ICONS: Record<string, LucideIcon> = {
  System: Database,
  Personal: Home,
  'UF Health': Briefcase,
  'As The Geek Learns': FileText,
  Development: Code,
  Resistance: Heart,
  Learning: BookOpen,
  Archive: Archive,
};

// =============================================================================
// Component
// =============================================================================

function CategoryTree({
  areas,
  categories,
  selectedCategory,
  onSelectCategory,
  onSelectArea,
}: CategoryTreeProps): JSX.Element {
  const [expandedAreas, setExpandedAreas] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5, 6, 7, 8])
  );

  // Memoize categories grouped by area_id to avoid filtering on every render
  const categoriesByArea = useMemo(() => {
    const grouped = new Map<number, Category[]>();
    for (const category of categories) {
      if (!grouped.has(category.area_id)) {
        grouped.set(category.area_id, []);
      }
      grouped.get(category.area_id)!.push(category);
    }
    return grouped;
  }, [categories]);

  const toggleArea = (areaId: number, e: MouseEvent): void => {
    e.stopPropagation();
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
    }
    setExpandedAreas(newExpanded);
  };

  return (
    <div className="space-y-1">
      {areas.map((area) => {
        const Icon = AREA_ICONS[area.name] || FolderTree;
        const areaCategories = categoriesByArea.get(area.id) || [];
        const isExpanded = expandedAreas.has(area.id);

        return (
          <div key={area.id}>
            <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors">
              <button
                onClick={(e) => toggleArea(area.id, e)}
                className="p-0.5 hover:bg-slate-600 rounded transition-colors"
                aria-label={isExpanded ? 'Collapse area' : 'Expand area'}
                type="button"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <button
                onClick={() => onSelectArea(area)}
                className="flex-1 flex items-center gap-2 text-left"
                type="button"
              >
                <Icon size={16} style={{ color: area.color }} />
                <span className="font-medium text-sm">
                  {area.range_start.toString().padStart(2, '0')}-
                  {area.range_end.toString().padStart(2, '0')}
                </span>
                <span className="text-slate-400 text-sm truncate">{area.name}</span>
              </button>
            </div>

            {isExpanded && (
              <div className="ml-6 space-y-0.5">
                {areaCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors ${
                      selectedCategory?.id === cat.id
                        ? 'bg-teal-600/30 text-teal-300'
                        : 'hover:bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    <span className="jd-number text-xs">
                      {cat.number.toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CategoryTree;
