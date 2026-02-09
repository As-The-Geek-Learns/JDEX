import React from 'react';
import { Cloud, Lock, Briefcase, FolderTree } from 'lucide-react';

function SensitivityBadge({ sensitivity, isInherited = false }) {
  const config = {
    standard: {
      label: 'Standard',
      class:
        'bg-gradient-to-r from-slate-600/30 to-slate-700/20 text-slate-300 border-slate-500/30',
      icon: Cloud,
    },
    sensitive: {
      label: 'Sensitive',
      class: 'bg-gradient-to-r from-red-500/20 to-red-600/10 text-red-400 border-red-500/30',
      icon: Lock,
    },
    work: {
      label: 'Work',
      class: 'bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
      icon: Briefcase,
    },
    inherit: {
      label: 'Inherit',
      class:
        'bg-gradient-to-r from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30',
      icon: FolderTree,
    },
  };

  const { label, class: className, icon: Icon } = config[sensitivity] || config.standard;

  return (
    <span
      className={`${className} px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 border`}
    >
      <Icon size={10} />
      {isInherited ? `(${label})` : label}
    </span>
  );
}

export default SensitivityBadge;
