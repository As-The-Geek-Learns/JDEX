/**
 * SettingsModal Component
 * =======================
 * Multi-tabbed settings modal for application configuration.
 *
 * WHAT: Tabbed modal for all app settings.
 * WHY: Centralized access to appearance, areas, categories, cloud, license, and database settings.
 */

import type { JSX } from 'react';
import { useState } from 'react';
import {
  FolderTree,
  Database,
  Shield,
  Cloud,
  X,
  Layers,
  MessageSquare,
  Settings,
  Palette,
} from 'lucide-react';
import AreasTab from '../Settings/AreasTab.jsx';
import CategoriesTab from '../Settings/CategoriesTab.jsx';
import DatabaseTab from '../Settings/DatabaseTab.jsx';
import CloudDriveSettings from '../Settings/CloudDriveSettings.jsx';
import LicenseSettings from '../Settings/LicenseSettings.jsx';
import FeedbackSettings from '../Settings/FeedbackSettings.jsx';
import AppearanceSettings from '../Settings/AppearanceSettings.jsx';
import type { Area, Category } from '../../types/index.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Available settings tabs.
 */
type SettingsTab =
  | 'appearance'
  | 'areas'
  | 'categories'
  | 'cloud'
  | 'license'
  | 'database'
  | 'feedback';

/**
 * Props for SettingsModal component.
 */
export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: Area[];
  categories: Category[];
  onDataChange: () => void;
}

// =============================================================================
// Component
// =============================================================================

function SettingsModal({
  isOpen,
  onClose,
  areas,
  categories,
  onDataChange,
}: SettingsModalProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-5xl h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings size={24} />
            System Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg" type="button">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'appearance' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
            type="button"
          >
            <Palette size={16} className="inline mr-2" />
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'areas' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
            type="button"
          >
            <Layers size={16} className="inline mr-2" />
            Areas
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
            type="button"
          >
            <FolderTree size={16} className="inline mr-2" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'cloud' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
            type="button"
          >
            <Cloud size={16} className="inline mr-2" />
            Cloud Storage
          </button>
          <button
            onClick={() => setActiveTab('license')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'license' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
            type="button"
          >
            <Shield size={16} className="inline mr-2" />
            License
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'database' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
            type="button"
          >
            <Database size={16} className="inline mr-2" />
            Database
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'feedback' ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-white'}`}
            type="button"
          >
            <MessageSquare size={16} className="inline mr-2" />
            Feedback
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'appearance' && <AppearanceSettings />}

          {activeTab === 'areas' && <AreasTab areas={areas} onDataChange={onDataChange} />}

          {activeTab === 'categories' && (
            <CategoriesTab areas={areas} categories={categories} onDataChange={onDataChange} />
          )}

          {activeTab === 'cloud' && <CloudDriveSettings />}

          {activeTab === 'license' && <LicenseSettings />}

          {activeTab === 'database' && <DatabaseTab onDataChange={onDataChange} />}

          {activeTab === 'feedback' && <FeedbackSettings />}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
