import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  FolderOpen, 
  Eye,
  Calendar,
  X,
  Crown,
  Lock
} from 'lucide-react';
import { useLicense } from '../../context/LicenseContext.jsx';
import { getDashboardStats, hasStatisticsData } from '../../services/statisticsService.js';
import StatCard from './StatCard.jsx';
import ActivityChart from './ActivityChart.jsx';
import FileTypeChart from './FileTypeChart.jsx';
import TopRulesCard from './TopRulesCard.jsx';

/**
 * StatsDashboard - Premium feature showing organization statistics
 */
export default function StatsDashboard({ onClose }) {
  const { isPremium, showUpgradePrompt } = useLicense();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    setIsLoading(true);
    try {
      const data = getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('[StatsDashboard] Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Premium gate - show upgrade prompt for free users
  if (!isPremium) {
    return (
      <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
        <div className="glass-card w-full max-w-lg animate-fade-in">
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-purple-400" />
              Statistics Dashboard
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/30 flex items-center justify-center">
              <Lock size={32} className="text-purple-400" />
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              Premium Feature
            </h3>
            <p className="text-slate-400 mb-6">
              The Statistics Dashboard is available to premium users. 
              Upgrade to see your organization patterns, track your progress, 
              and optimize your file management.
            </p>
            
            <div className="glass-card p-4 mb-6 text-left">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <Crown size={16} className="text-amber-400" />
                What you'll get:
              </h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Total files organized over time</li>
                <li>• File type distribution charts</li>
                <li>• Most effective rules analysis</li>
                <li>• Watch folder activity tracking</li>
                <li>• Monthly organization trends</li>
              </ul>
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => showUpgradePrompt('Statistics Dashboard')}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 transition-all flex items-center gap-2"
              >
                <Crown size={16} />
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
        <div className="glass-card w-full max-w-5xl h-[85vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse text-6xl mb-4">📊</div>
            <div className="text-xl text-slate-400">Loading statistics...</div>
          </div>
        </div>
      </div>
    );
  }

  // Check if there's any data
  const hasData = stats && (stats.totalOrganized > 0 || stats.activeRules > 0);

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-5xl h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <BarChart3 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Statistics Dashboard</h2>
              <p className="text-sm text-slate-400">Your organization activity at a glance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
            
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasData ? (
            /* Empty State */
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Statistics Yet
                </h3>
                <p className="text-slate-400 mb-6">
                  Start organizing files with the File Organizer to see your 
                  statistics here. Track your progress, see patterns, and 
                  optimize your workflow.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                >
                  Start Organizing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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
                <ActivityChart 
                  data={stats.activityByDay} 
                  title="Files Organized Over Time"
                />
                <FileTypeChart 
                  data={stats.filesByType} 
                  title="Files by Type"
                />
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopRulesCard 
                  rules={stats.topRules} 
                  title="Top Organization Rules"
                />
                
                {/* Watch Activity Card */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Eye size={18} className="text-blue-400" />
                    Watch Folder Activity
                  </h3>
                  
                  {stats.watchActivity.folders > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">
                          {stats.watchActivity.folders}
                        </div>
                        <div className="text-xs text-slate-400">Active Folders</div>
                      </div>
                      <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">
                          {stats.watchActivity.today}
                        </div>
                        <div className="text-xs text-slate-400">Today</div>
                      </div>
                      <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                        <div className="text-2xl font-bold text-white">
                          {stats.watchActivity.total}
                        </div>
                        <div className="text-xs text-slate-400">Total Events</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Eye size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No watch folders configured</p>
                      <p className="text-sm">Set up watch folders to auto-organize files</p>
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
