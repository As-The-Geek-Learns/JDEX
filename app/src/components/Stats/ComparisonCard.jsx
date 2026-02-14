/**
 * ComparisonCard Component
 * ========================
 * Displays a stat comparison between current and previous periods.
 * Shows the value, trend direction, and percentage change.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Calculate percentage change between two values.
 * @param {number} current - Current period value
 * @param {number} previous - Previous period value
 * @returns {number|null} Percentage change or null if previous is 0
 */
function calculateChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0; // Special case: from 0 to something is 100%
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get trend indicator based on change percentage.
 * @param {number} change - Percentage change
 * @returns {{ icon: React.Component, color: string, label: string }}
 */
function getTrendIndicator(change) {
  if (change > 0) {
    return {
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      label: 'increase',
    };
  } else if (change < 0) {
    return {
      icon: TrendingDown,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      label: 'decrease',
    };
  } else {
    return {
      icon: Minus,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      label: 'no change',
    };
  }
}

export default function ComparisonCard({
  title,
  currentValue,
  previousValue,
  currentLabel = 'Current',
  previousLabel = 'Previous',
  icon: Icon,
  color = 'purple',
  formatValue = (v) => v,
}) {
  const change = calculateChange(currentValue, previousValue);
  const trend = getTrendIndicator(change);
  const TrendIcon = trend.icon;

  // Color mappings for stat card accents
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-600/10',
    teal: 'from-teal-500/20 to-teal-600/10',
    amber: 'from-amber-500/20 to-amber-600/10',
    blue: 'from-blue-500/20 to-blue-600/10',
    green: 'from-green-500/20 to-green-600/10',
  };

  const iconColorClasses = {
    purple: 'text-purple-400',
    teal: 'text-teal-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
  };

  return (
    <div className="glass-card p-5 relative overflow-hidden group">
      {/* Gradient accent */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses[color]}`}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]}
            flex items-center justify-center`}
          >
            <Icon size={20} className={iconColorClasses[color]} />
          </div>
        )}
        <h4 className="text-sm font-medium text-slate-400">{title}</h4>
      </div>

      {/* Values comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Current period */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-white">{formatValue(currentValue)}</div>
          <div className="text-xs text-slate-500">{currentLabel}</div>
        </div>

        {/* Previous period */}
        <div className="space-y-1">
          <div className="text-xl font-medium text-slate-400">{formatValue(previousValue)}</div>
          <div className="text-xs text-slate-500">{previousLabel}</div>
        </div>
      </div>

      {/* Trend indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${trend.bgColor}`}>
        <TrendIcon size={16} className={trend.color} />
        <span className={`text-sm font-medium ${trend.color}`}>
          {change > 0 ? '+' : ''}
          {change}%
        </span>
        <span className="text-xs text-slate-400">{trend.label}</span>
      </div>
    </div>
  );
}

/**
 * Utility function to get a previous period date range based on current range.
 * @param {Date} start - Current period start
 * @param {Date} end - Current period end
 * @returns {{ start: Date, end: Date }} Previous period range
 */
export function getPreviousPeriodRange(start, end) {
  if (!start || !end) return { start: null, end: null };

  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1); // Day before current start
  const previousStart = new Date(previousEnd.getTime() - duration);

  return { start: previousStart, end: previousEnd };
}
