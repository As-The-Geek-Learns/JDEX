import React from 'react';
import { Zap, FileText, FolderSearch, Code, Hash } from 'lucide-react';

/**
 * TopRulesCard - Displays top organization rules by match count
 */
export default function TopRulesCard({ rules = [], title = 'Top Organization Rules' }) {
  // Icon mapping for rule types
  const ruleTypeIcons = {
    extension: FileText,
    keyword: Hash,
    path: FolderSearch,
    regex: Code,
  };

  // Calculate max for bar sizing
  const maxCount = rules.length > 0 ? Math.max(...rules.map((r) => r.matchCount)) : 1;

  if (rules.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={18} className="text-amber-400" />
          {title}
        </h3>
        <div className="h-32 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-4xl mb-2">⚡</div>
            <p>No active rules yet</p>
            <p className="text-sm">Create rules to see usage stats</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Zap size={18} className="text-amber-400" />
        {title}
      </h3>

      <div className="space-y-3">
        {rules.map((rule, index) => {
          const Icon = ruleTypeIcons[rule.type] || FileText;
          const percentage = (rule.matchCount / maxCount) * 100;

          return (
            <div key={index} className="relative">
              {/* Background bar */}
              <div className="absolute inset-0 bg-slate-700/30 rounded-lg" />
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-600/40 to-teal-500/20 rounded-lg transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />

              {/* Content */}
              <div className="relative flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm w-4">{index + 1}.</span>
                  <Icon size={14} className="text-slate-400" />
                  <span className="text-slate-200 font-medium truncate max-w-[180px]">
                    {rule.name}
                  </span>
                  <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-slate-700/50 rounded">
                    {rule.type}
                  </span>
                </div>
                <span className="text-teal-400 font-semibold tabular-nums">
                  {rule.matchCount.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {rules.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/50 text-center">
          <span className="text-xs text-slate-500">
            Total matches: {rules.reduce((sum, r) => sum + r.matchCount, 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
