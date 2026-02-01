/**
 * Feedback Settings Component
 * ===========================
 * Allows users to submit feedback about the app via email.
 * 
 * Features:
 * - Feedback type selector (Bug, Feature, Design, General)
 * - Message input with character count
 * - Opens native email client with pre-filled content
 * - Optional: Link to external feedback form
 */

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Palette, 
  CircleHelp,
  Mail,
  ExternalLink,
  Send,
  CheckCircle,
  Copy,
  Sparkles
} from 'lucide-react';

// =============================================================================
// Configuration
// =============================================================================

const FEEDBACK_EMAIL = 'feedback@jdex.app'; // Update with your actual email
const APP_VERSION = '2.0.0';

const FEEDBACK_TYPES = [
  {
    id: 'bug',
    label: 'Bug Report',
    icon: Bug,
    color: 'red',
    description: 'Something isn\'t working correctly',
    subjectPrefix: '[Bug]',
  },
  {
    id: 'feature',
    label: 'Feature Request',
    icon: Lightbulb,
    color: 'amber',
    description: 'Suggest a new feature or improvement',
    subjectPrefix: '[Feature]',
  },
  {
    id: 'design',
    label: 'Design Feedback',
    icon: Palette,
    color: 'purple',
    description: 'UI/UX suggestions and visual feedback',
    subjectPrefix: '[Design]',
  },
  {
    id: 'general',
    label: 'General Feedback',
    icon: CircleHelp,
    color: 'teal',
    description: 'Questions, comments, or other feedback',
    subjectPrefix: '[Feedback]',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function getColorClasses(color) {
  const colors = {
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      gradient: 'from-red-500 to-rose-500',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      gradient: 'from-amber-500 to-orange-500',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      gradient: 'from-purple-500 to-violet-500',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
    },
    teal: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/30',
      text: 'text-teal-400',
      gradient: 'from-teal-500 to-cyan-500',
      glow: 'shadow-[0_0_15px_rgba(20,184,166,0.2)]',
    },
  };
  return colors[color] || colors.teal;
}

function buildEmailUrl(type, message) {
  const feedbackType = FEEDBACK_TYPES.find(t => t.id === type);
  const subject = encodeURIComponent(`${feedbackType?.subjectPrefix || '[Feedback]'} JDex v${APP_VERSION}`);
  
  const body = encodeURIComponent(
    `${message}\n\n` +
    `---\n` +
    `App: JDex v${APP_VERSION}\n` +
    `Platform: ${navigator.platform}\n` +
    `Date: ${new Date().toISOString()}`
  );
  
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
}

// =============================================================================
// Sub-Components
// =============================================================================

function FeedbackTypeCard({ type, isSelected, onSelect }) {
  const Icon = type.icon;
  const colors = getColorClasses(type.color);
  
  return (
    <button
      onClick={() => onSelect(type.id)}
      className={`
        relative p-4 rounded-xl border transition-all text-left group
        ${isSelected 
          ? `${colors.bg} ${colors.border} ${colors.glow}` 
          : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center transition-all
          ${isSelected 
            ? `bg-gradient-to-br ${colors.gradient} text-white` 
            : 'bg-slate-700/50 text-slate-400 group-hover:text-slate-300'
          }
        `}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
            {type.label}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {type.description}
          </p>
        </div>
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br ${colors.gradient}`} />
      )}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function FeedbackSettings() {
  const [selectedType, setSelectedType] = useState('general');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const maxLength = 2000;
  const selectedTypeInfo = FEEDBACK_TYPES.find(t => t.id === selectedType);
  const colors = getColorClasses(selectedTypeInfo?.color || 'teal');
  
  const handleSendEmail = () => {
    if (!message.trim()) return;
    
    const emailUrl = buildEmailUrl(selectedType, message);
    window.open(emailUrl, '_blank');
    setSent(true);
    
    // Reset after a delay
    setTimeout(() => {
      setSent(false);
      setMessage('');
    }, 3000);
  };
  
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(FEEDBACK_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-purple-500 
            flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            <MessageSquare size={20} className="text-white" />
          </span>
          Feedback
        </h2>
        <p className="text-slate-400 mt-2">
          Help us improve JDex! Your feedback shapes the future of this app.
        </p>
      </div>
      
      {/* Feedback Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          What type of feedback do you have?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {FEEDBACK_TYPES.map(type => (
            <FeedbackTypeCard
              key={type.id}
              type={type}
              isSelected={selectedType === type.id}
              onSelect={setSelectedType}
            />
          ))}
        </div>
      </div>
      
      {/* Message Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Your message
        </label>
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            placeholder={
              selectedType === 'bug' 
                ? 'Describe the bug: what happened, what you expected, and steps to reproduce...'
                : selectedType === 'feature'
                ? 'Describe the feature you\'d like to see and how it would help you...'
                : selectedType === 'design'
                ? 'Share your design thoughts, suggestions, or attach screenshots via email...'
                : 'Share your thoughts, questions, or comments...'
            }
            rows={5}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl 
              text-white placeholder-slate-500 resize-none
              focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
          <div className="absolute bottom-3 right-3 text-xs text-slate-500">
            {message.length}/{maxLength}
          </div>
        </div>
      </div>
      
      {/* Send Button */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={handleSendEmail}
          disabled={!message.trim() || sent}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl
            font-medium transition-all
            ${sent 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : message.trim()
                ? `bg-gradient-to-r ${colors.gradient} text-white hover:opacity-90 
                   shadow-[0_4px_15px_rgba(20,184,166,0.3)]`
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {sent ? (
            <>
              <CheckCircle size={18} />
              Email Client Opened!
            </>
          ) : (
            <>
              <Send size={18} />
              Open in Email App
            </>
          )}
        </button>
      </div>
      
      {/* Alternative Contact */}
      <div className="glass-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
            <Mail size={18} className="text-slate-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-white mb-1">Prefer to email directly?</h4>
            <p className="text-sm text-slate-400 mb-2">
              Send your feedback to:
            </p>
            <div className="flex items-center gap-2">
              <code className="px-3 py-1.5 bg-slate-800 rounded-lg text-teal-400 font-mono text-sm">
                {FEEDBACK_EMAIL}
              </code>
              <button
                onClick={handleCopyEmail}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 
                  rounded-lg transition-colors"
                title="Copy email"
              >
                {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Design Feedback Tip */}
      {selectedType === 'design' && (
        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-purple-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-300 mb-1">Design Feedback Tip</h4>
              <p className="text-sm text-purple-200/70">
                For visual feedback, attach screenshots to your email showing what you like 
                or what you'd change. You can also share links to designs that inspire you!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* What Happens Next */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <h4 className="text-sm font-medium text-slate-300 mb-3">What happens next?</h4>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            We read every piece of feedback
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Bug reports are prioritized and fixed in updates
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Popular feature requests get added to our roadmap
          </li>
        </ul>
      </div>
    </div>
  );
}
