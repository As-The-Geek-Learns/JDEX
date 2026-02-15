/**
 * StatsDashboard Component
 * ========================
 * Premium feature showing organization statistics.
 * Modern design with animations and rich visual feedback.
 */

import type { JSX } from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  ChartColumn,
  TrendingUp,
  Zap,
  FolderOpen,
  Eye,
  Calendar,
  X,
  Crown,
  Lock,
  Sparkles,
  RefreshCw,
  Download,
  ArrowLeftRight,
} from 'lucide-react';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { useLicense, UpgradePrompt } from '../../context/LicenseContext.js';
import { getDashboardStats } from '../../services/statisticsService.js';
import { downloadStatisticsReport } from '../../services/csvExportService.js';
import StatCard from './StatCard.js';
import ActivityChart from './ActivityChart.js';
import FileTypeChart from './FileTypeChart.js';
import TopRulesCard from './TopRulesCard.js';
import DateRangePicker from './DateRangePicker.js';
import ComparisonView from './ComparisonView.js';
import { getPreviousPeriodRange } from '../../utils/dateUtils.js';
import type { DateRangeValue } from './DateRangePicker.js';
import type { TopRule } from './TopRulesCard.js';
import type { ActivityData } from './ActivityChart.js';
import type { FileTypeData } from './FileTypeChart.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Props for the StatsDashboard component
 */
export interface StatsDashboardProps {
  onClose: () => void;
}

/**
 * Watch folder activity data
 */
interface WatchActivity {
  folders: number;
  today: number;
  total: number;
}

/**
 * Dashboard statistics data
 */
interface DashboardStats {
  totalOrganized: number;
  thisMonth: number;
  activeRules: number;
  topCategory: string;
  activityByDay: ActivityData[];
  filesByType: FileTypeData[];
  topRules: TopRule[];
  watchActivity: WatchActivity;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get default date range: last 30 days
 */
function getDefaultDateRange(): DateRangeValue {
  return {
    start: startOfDay(subDays(new Date(), 29)),
    end: endOfDay(new Date()),
  };
}

// ============================================
// COMPONENT
// ============================================

export default function StatsDashboard({ onClose }: StatsDashboardProps): JSX.Element {
  const { isPremium } = useLicense();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [previousStats, setPreviousStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDefaultDateRange);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadStats = useCallback(
    async (range: DateRangeValue = dateRange): Promise<void> => {
      setIsLoading(true);
      try {
        // Pass date range to stats service
        const data = getDashboardStats(range.start, range.end) as DashboardStats;
        setStats(data);
      } catch (error) {
        console.error('[StatsDashboard] Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [dateRange]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleDateRangeChange = (newRange: DateRangeValue): void => {
    setDateRange(newRange);
    loadStats(newRange);
  };

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    await loadStats();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportCSV = (): void => {
    if (stats) {
      downloadStatisticsReport(stats, dateRange);
    }
  };

  const handleToggleComparison = async (): Promise<void> => {
    if (!showComparison && dateRange.start && dateRange.end) {
      // Load previous period stats
      const prevRange = getPreviousPeriodRange(dateRange.start, dateRange.end);
      if (prevRange.start && prevRange.end) {
        try {
          const prevData = getDashboardStats(prevRange.start, prevRange.end) as DashboardStats;
          setPreviousStats(prevData);
        } catch (error) {
          console.error('[StatsDashboard] Error loading previous stats:', error);
        }
      }
    }
    setShowComparison(!showComparison);
  };

  // Premium gate - show upgrade prompt for free users
  if (!isPremium) {
    return (
      <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
        <div className="glass-card w-full max-w-lg animate-fade-in-up overflow-hidden">
          {/* Decorative gradient header */}
          <div className="relative h-32 bg-gradient-to-br from-purple-600/30 via-fuchsia-600/20 to-teal-600/30 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700
                  flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.4)]"
                >
                  <Lock size={36} className="text-white" />
                </div>
                {/* Animated rings */}
                <div
                  className="absolute inset-0 -m-4 rounded-3xl border-2 border-purple-400/20 animate-ping"
                  style={{ animationDuration: '3s' }}
                />
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-white/70" />
            </button>
          </div>

          <div className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Premium Feature</h3>
            <p className="text-slate-400 mb-6">
              Unlock the Statistics Dashboard to see your organization patterns, track progress, and
              optimize your workflow.
            </p>

            {/* Features list */}
            <div className="glass-card p-5 mb-6 text-left space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Crown size={18} className="text-amber-400" />
                What's included:
              </h4>
              <div className="grid gap-2">
                {[
                  'Total files organized over time',
                  'File type distribution charts',
                  'Most effective rules analysis',
                  'Watch folder activity tracking',
                  'Monthly organization trends',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                    <Sparkles size={14} className="text-purple-400" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300
                  hover:bg-slate-700/50 hover:border-slate-500 transition-all"
              >
                Maybe Later
              </button>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-200
                  bg-gradient-to-r from-purple-600 to-purple-500 text-white
                  shadow-[0_2px_10px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
                  hover:from-purple-500 hover:to-purple-400 hover:shadow-[0_4px_20px_rgba(139,92,246,0.4)]
                  hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <Crown size={16} />
                Upgrade
              </button>
            </div>

            {/* Upgrade prompt modal */}
            {showUpgradeModal && (
              <UpgradePrompt
                feature="statistics"
                onClose={() => setShowUpgradeModal(false)}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
        <div className="glass-card w-full max-w-5xl h-[85vh] flex flex-col">
          {/* Skeleton header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl skeleton" />
              <div className="space-y-2">
                <div className="h-6 w-48 skeleton" />
                <div className="h-4 w-32 skeleton" />
              </div>
            </div>
          </div>
          {/* Skeleton content */}
          <div className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 skeleton rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-64 skeleton rounded-xl" />
              <div className="h-64 skeleton rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if there's any data
  const hasData = stats && (stats.totalOrganized > 0 || stats.activeRules > 0);

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-5xl h-[85vh] flex flex-col animate-fade-in-up overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative flex items-center justify-between p-6 border-b border-slate-700/50">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-fuchsia-600/5 to-teal-600/10" />

          <div className="relative flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700
              flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.3)]"
            >
              <ChartColumn size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Statistics Dashboard
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-medium">
                  PRO
                </span>
              </h2>
              <p className="text-sm text-slate-400">Your organization activity at a glance</p>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {/* Date range picker */}
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

            {/* Comparison toggle button */}
            <button
              onClick={handleToggleComparison}
              disabled={!stats || isLoading || !dateRange.start || !dateRange.end}
              className={`p-2.5 rounded-xl transition-all group
                disabled:opacity-50 disabled:cursor-not-allowed
                ${showComparison ? 'bg-purple-600/20 text-purple-400' : 'hover:bg-slate-700/50'}`}
              title="Compare with previous period"
            >
              <ArrowLeftRight
                size={18}
                className={`transition-colors ${
                  showComparison ? 'text-purple-400' : 'text-slate-400 group-hover:text-white'
                }`}
              />
            </button>

            {/* Export button */}
            <button
              onClick={handleExportCSV}
              disabled={!stats || isLoading}
              className="p-2.5 hover:bg-slate-700/50 rounded-xl transition-all group
                disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export statistics to CSV"
            >
              <Download
                size={18}
                className="text-slate-400 group-hover:text-white transition-colors"
              />
            </button>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              className="p-2.5 hover:bg-slate-700/50 rounded-xl transition-all group"
              title="Refresh statistics"
            >
              <RefreshCw
                size={18}
                className={`text-slate-400 group-hover:text-white transition-colors
                ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>

            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-700/50 rounded-xl transition-all group"
            >
              <X size={18} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasData ? (
            /* Empty State - Modern Design */
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md animate-fade-in">
                {/* Animated icon */}
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20
                    flex items-center justify-center"
                  >
                    <ChartColumn size={48} className="text-purple-400" />
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-500/30 animate-pulse" />
                  <div
                    className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-purple-500/30 animate-pulse"
                    style={{ animationDelay: '0.5s' }}
                  />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">No Statistics Yet</h3>
                <p className="text-slate-400 mb-8">
                  Start organizing files with the File Organizer to see your statistics here. Track
                  your progress, see patterns, and optimize your workflow.
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl font-medium transition-all duration-200
                    bg-gradient-to-r from-purple-600 to-purple-500 text-white
                    shadow-[0_2px_10px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
                    hover:from-purple-500 hover:to-purple-400 hover:shadow-[0_4px_20px_rgba(139,92,246,0.4)]
                    hover:-translate-y-0.5 active:translate-y-0"
                >
                  Start Organizing
                </button>
              </div>
            </div>
          ) : showComparison ? (
            <ComparisonView
              currentStats={stats}
              previousStats={previousStats}
              dateRange={dateRange}
              onClose={() => setShowComparison(false)}
            />
          ) : (
            <div className="space-y-6 animate-stagger">
              {/* Top Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Organized"
                  value={stats.totalOrganized}
                  icon={FolderOpen}
                  color="teal"
                  subtitle="All time"
                />
                <StatCard
                  title="This Month"
                  value={stats.thisMonth}
                  icon={Calendar}
                  color="amber"
                  subtitle={new Date().toLocaleDateString('en-US', { month: 'long' })}
                />
                <StatCard
                  title="Active Rules"
                  value={stats.activeRules}
                  icon={Zap}
                  color="purple"
                  subtitle="Organization rules"
                />
                <StatCard
                  title="Top Category"
                  value={stats.topCategory}
                  icon={TrendingUp}
                  color="blue"
                  subtitle="Most organized to"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityChart data={stats.activityByDay} title="Files Organized Over Time" />
                <FileTypeChart data={stats.filesByType} title="Files by Type" />
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopRulesCard rules={stats.topRules} title="Top Organization Rules" />

                {/* Watch Activity Card - Enhanced */}
                <div className="glass-card p-6 relative overflow-hidden group">
                  {/* Decorative gradient */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-80" />

                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10
                      flex items-center justify-center"
                    >
                      <Eye size={16} className="text-blue-400" />
                    </div>
                    Watch Folder Activity
                  </h3>

                  {stats.watchActivity.folders > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="stat-card stat-card-blue p-4 text-center">
                        <div
                          className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-300
                          bg-clip-text text-transparent"
                        >
                          {stats.watchActivity.folders}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Active Folders</div>
                      </div>
                      <div className="stat-card stat-card-green p-4 text-center">
                        <div
                          className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-300
                          bg-clip-text text-transparent"
                        >
                          {stats.watchActivity.today}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Today</div>
                      </div>
                      <div className="stat-card p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                          {stats.watchActivity.total}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Total Events</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div
                        className="w-16 h-16 mx-auto mb-3 rounded-xl bg-slate-800/50
                        flex items-center justify-center"
                      >
                        <Eye size={28} className="text-slate-600" />
                      </div>
                      <p className="text-slate-400">No watch folders configured</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Set up watch folders to auto-organize files
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
