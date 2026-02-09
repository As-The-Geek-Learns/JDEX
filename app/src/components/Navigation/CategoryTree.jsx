import React, { useState } from 'react';
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

// Area icon mapping
const areaIcons = {
  System: Database,
  Personal: Home,
  'UF Health': Briefcase,
  'As The Geek Learns': FileText,
  Development: Code,
  Resistance: Heart,
  Learning: BookOpen,
  Archive: Archive,
};

function CategoryTree({ areas, categories, selectedCategory, onSelectCategory, onSelectArea }) {
  const [expandedAreas, setExpandedAreas] = useState(new Set([1, 2, 3, 4, 5, 6, 7, 8]));

  const toggleArea = (areaId, e) => {
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
        const Icon = areaIcons[area.name] || FolderTree;
        const areaCategories = categories.filter((c) => c.area_id === area.id);
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
