/**
 * QuickStatsOverview Component
 * ============================
 * Dashboard overview with stat cards.
 *
 * WHAT: Grid of stat cards showing key metrics.
 * WHY: Provides at-a-glance summary of content organization.
 */

import type { JSX } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FolderOpen, File, Lock, Briefcase } from 'lucide-react';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Stats data for overview
 */
export interface QuickStats {
  totalFolders: number;
  totalItems: number;
  sensitiveFolders: number;
  sensitiveItems: number;
  workFolders: number;
  workItems: number;
}

/**
 * Props for QuickStatsOverview component.
 */
export interface QuickStatsOverviewProps {
  stats: QuickStats;
}

interface StatItem {
  value: number;
  label: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

// =============================================================================
// Component
// =============================================================================

function QuickStatsOverview({ stats }: QuickStatsOverviewProps): JSX.Element {
  const statItems: StatItem[] = [
    {
      value: stats.totalFolders,
      label: 'Folders (XX.XX)',
      icon: FolderOpen,
      color: 'amber',
      gradient: 'from-amber-400 to-amber-300',
      iconBg: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-400',
    },
    {
      value: stats.totalItems,
      label: 'Items (XX.XX.XX)',
      icon: File,
      color: 'teal',
      gradient: 'from-teal-400 to-teal-300',
      iconBg: 'from-teal-500/20 to-teal-600/10',
      iconColor: 'text-teal-400',
    },
    {
      value: stats.sensitiveFolders + stats.sensitiveItems,
      label: 'Sensitive',
      icon: Lock,
      color: 'red',
      gradient: 'from-red-400 to-red-300',
      iconBg: 'from-red-500/20 to-red-600/10',
      iconColor: 'text-red-400',
    },
    {
      value: stats.workFolders + stats.workItems,
      label: 'Work',
      icon: Briefcase,
      color: 'blue',
      gradient: 'from-blue-400 to-blue-300',
      iconBg: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-stagger">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="stat-card group relative overflow-hidden">
            {/* Gradient top border */}
            <div
              className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${item.gradient} opacity-80`}
            />

            {/* Content */}
            <div className="relative flex items-start gap-3">
              <div
                className={`
                w-10 h-10 rounded-xl bg-gradient-to-br ${item.iconBg}
                flex items-center justify-center flex-shrink-0
                group-hover:scale-105 transition-transform duration-300
              `}
              >
                <Icon size={20} className={item.iconColor} />
              </div>
              <div>
                <div
                  className={`text-2xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}
                >
                  {item.value}
                </div>
                <div className="text-sm text-slate-400">{item.label}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default QuickStatsOverview;
