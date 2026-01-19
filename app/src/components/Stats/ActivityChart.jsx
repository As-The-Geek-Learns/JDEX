import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * ActivityChart - Area chart showing files organized over time
 */
export default function ActivityChart({ data = [], title = 'Files Organized Over Time' }) {
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-slate-300 text-sm">{formatDate(label)}</p>
          <p className="text-teal-400 font-semibold">
            {payload[0].value} files organized
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate total for the period
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>No activity data yet</p>
            <p className="text-sm">Organize files to see your progress</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="text-sm text-slate-400">
          <span className="text-teal-400 font-semibold">{total}</span> files in last 30 days
        </div>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#334155" 
              vertical={false} 
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#14b8a6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
