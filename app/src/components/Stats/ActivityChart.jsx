import { TrendingUp, ChartColumn } from 'lucide-react';
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
 * ActivityChart - Modern area chart showing files organized over time
 */
export default function ActivityChart({ data = [], title = 'Files Organized Over Time' }) {
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Custom tooltip with modern styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-4 py-3 shadow-xl border-slate-600/50 animate-fade-in">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{formatDate(label)}</p>
          <p
            className="text-lg font-bold bg-gradient-to-r from-teal-400 to-teal-300 
            bg-clip-text text-transparent"
          >
            {payload[0].value} files
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
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-80" />
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10
            flex items-center justify-center"
          >
            <TrendingUp size={16} className="text-teal-400" />
          </div>
          {title}
        </h3>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 mx-auto mb-3 rounded-xl bg-slate-800/50 
              flex items-center justify-center"
            >
              <ChartColumn size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-400">No activity data yet</p>
            <p className="text-sm text-slate-500 mt-1">Organize files to see your progress</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-80" />

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-teal-600/10
            flex items-center justify-center group-hover:scale-105 transition-transform"
          >
            <TrendingUp size={16} className="text-teal-400" />
          </div>
          {title}
        </h3>
        <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <span className="text-teal-400 font-bold">{total}</span>
          <span className="text-slate-400 text-sm ml-1">last 30 days</span>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
              strokeOpacity={0.5}
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#14b8a6', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="url(#strokeGradient)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorCount)"
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
