/**
 * ComparisonView Component
 * ========================
 * Shows side-by-side comparison of statistics between two time periods.
 * Displays trend indicators and percentage changes.
 */

import { FolderOpen, Calendar, Zap, TrendingUp, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import ComparisonCard from './ComparisonCard.jsx';
import { getPreviousPeriodRange } from '../../utils/dateUtils.js';

export default function ComparisonView({ currentStats, previousStats, dateRange, onClose }) {
  if (!currentStats || !previousStats) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Loading comparison data...</p>
      </div>
    );
  }

  const previousRange = getPreviousPeriodRange(dateRange?.start, dateRange?.end);

  // Format period labels
  const currentLabel =
    dateRange?.start && dateRange?.end
      ? `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}`
      : 'Current';

  const previousLabel =
    previousRange?.start && previousRange?.end
      ? `${format(previousRange.start, 'MMM d')} - ${format(previousRange.end, 'MMM d')}`
      : 'Previous';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10
            flex items-center justify-center"
          >
            <ArrowLeftRight size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Period Comparison</h3>
            <p className="text-sm text-slate-400">
              {currentLabel} vs {previousLabel}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700
            rounded-lg transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComparisonCard
          title="Files Organized"
          currentValue={currentStats.totalOrganized || 0}
          previousValue={previousStats.totalOrganized || 0}
          currentLabel={currentLabel}
          previousLabel={previousLabel}
          icon={FolderOpen}
          color="teal"
        />

        <ComparisonCard
          title="This Period Activity"
          currentValue={currentStats.thisMonth || 0}
          previousValue={previousStats.thisMonth || 0}
          currentLabel="This period"
          previousLabel="Previous period"
          icon={Calendar}
          color="amber"
        />

        <ComparisonCard
          title="Active Rules"
          currentValue={currentStats.activeRules || 0}
          previousValue={previousStats.activeRules || 0}
          currentLabel="Current"
          previousLabel="Previous"
          icon={Zap}
          color="purple"
        />

        <ComparisonCard
          title="Daily Average"
          currentValue={calculateDailyAverage(currentStats.activityByDay)}
          previousValue={calculateDailyAverage(previousStats.activityByDay)}
          currentLabel={currentLabel}
          previousLabel={previousLabel}
          icon={TrendingUp}
          color="blue"
          formatValue={(v) => v.toFixed(1)}
        />
      </div>

      {/* Activity Trend Comparison */}
      <div className="glass-card p-6">
        <h4 className="text-sm font-medium text-slate-400 mb-4">Daily Activity Comparison</h4>
        <div className="grid grid-cols-2 gap-6">
          <ActivityTrend
            data={currentStats.activityByDay || []}
            label={currentLabel}
            color="teal"
          />
          <ActivityTrend
            data={previousStats.activityByDay || []}
            label={previousLabel}
            color="slate"
          />
        </div>
      </div>

      {/* File Types Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <FileTypesCompare data={currentStats.filesByType || []} label={currentLabel} />
        <FileTypesCompare data={previousStats.filesByType || []} label={previousLabel} isPrevious />
      </div>
    </div>
  );
}

/**
 * Calculate daily average from activity data.
 */
function calculateDailyAverage(activityByDay) {
  if (!activityByDay || activityByDay.length === 0) return 0;
  const total = activityByDay.reduce((sum, day) => sum + (day.count || 0), 0);
  return total / activityByDay.length;
}

/**
 * Simple activity trend visualization.
 */
function ActivityTrend({ data, label, color }) {
  const maxCount = Math.max(...data.map((d) => d.count || 0), 1);
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);

  const barColor = color === 'teal' ? 'bg-teal-500' : 'bg-slate-500';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-sm text-slate-400">{total} total</span>
      </div>
      <div className="flex items-end gap-0.5 h-16">
        {data.slice(-14).map((day, idx) => (
          <div
            key={idx}
            className={`flex-1 ${barColor} rounded-t opacity-80 hover:opacity-100 transition-opacity`}
            style={{ height: `${Math.max(4, (day.count / maxCount) * 100)}%` }}
            title={`${day.date}: ${day.count} files`}
          />
        ))}
      </div>
      <div className="text-xs text-slate-500 text-center">Last 14 days</div>
    </div>
  );
}

/**
 * File types breakdown comparison.
 */
function FileTypesCompare({ data, label, isPrevious = false }) {
  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <div className={`glass-card p-4 ${isPrevious ? 'opacity-75' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-xs text-slate-400">{total} files</span>
      </div>
      <div className="space-y-2">
        {data.slice(0, 5).map((item, idx) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">{item.type}</span>
                  <span className="text-slate-500">{percentage}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPrevious ? 'bg-slate-500' : 'bg-teal-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
