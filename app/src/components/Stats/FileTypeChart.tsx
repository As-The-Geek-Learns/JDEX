import type { JSX } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Payload } from 'recharts/types/component/DefaultLegendContent';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * File type data item
 */
export interface FileTypeData {
  type: string;
  count: number;
}

/**
 * Props for the FileTypeChart component
 */
export interface FileTypeChartProps {
  data?: FileTypeData[];
  title?: string;
}

/**
 * Tooltip payload type
 */
interface TooltipPayloadItem {
  payload: FileTypeData;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

interface LegendProps {
  payload?: Payload[];
}

// ============================================
// CONSTANTS
// ============================================

const COLORS = [
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
];

// ============================================
// COMPONENT
// ============================================

/**
 * FileTypeChart - Pie/donut chart showing file type distribution
 */
export default function FileTypeChart({
  data = [],
  title = 'Files by Type',
}: FileTypeChartProps): JSX.Element {
  // Calculate total
  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: CustomTooltipProps): JSX.Element | null => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-white font-medium">{item.payload.type}</p>
          <p className="text-slate-400 text-sm">
            {item.value} files ({((item.value / total) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = (props: LegendProps): JSX.Element => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap gap-2 justify-center mt-2">
        {payload?.map((entry, index) => (
          <li key={`legend-${index}`} className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-400">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (data.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📁</div>
            <p>No file type data</p>
            <p className="text-sm">Organize files to see distribution</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="count"
              nameKey="type"
            >
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Center stat */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ top: '-10px' }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-slate-400">files</div>
        </div>
      </div>
    </div>
  );
}
