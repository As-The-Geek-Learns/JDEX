import React from 'react';

/**
 * StatCard - Reusable card component for displaying a single statistic
 */
export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'teal',
  trend = null // { value: number, isPositive: boolean }
}) {
  const colorClasses = {
    teal: 'text-teal-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    white: 'text-white'
  };

  return (
    <div className="glass-card p-4 hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`text-3xl font-bold ${colorClasses[color] || colorClasses.teal}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="text-sm text-slate-400 flex items-center gap-1 mt-1">
            {Icon && <Icon size={14} />}
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
          )}
        </div>
        
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}
