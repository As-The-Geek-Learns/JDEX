/**
 * Rules Manager Component
 * =======================
 * UI for creating, editing, and managing organization rules.
 *
 * Features:
 * - List all rules with stats
 * - Create rules (extension, keyword, path, regex)
 * - Edit existing rules
 * - Delete rules
 * - Preview what files a rule would match
 */

import type { JSX, FormEvent, ChangeEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  getOrganizationRules,
  createOrganizationRule,
  updateOrganizationRule,
  deleteOrganizationRule,
  getFolders,
  getCategories,
  getAreas,
} from '../../db.js';
import type { TargetType } from '../../db/repositories/organization-rules.js';
import { sanitizeErrorForUser } from '../../utils/errors.js';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Icon component type
 */
type IconComponent = () => JSX.Element;

/**
 * Rule type identifier
 */
type RuleTypeId = 'extension' | 'keyword' | 'path' | 'regex' | 'compound' | 'date';

/**
 * Rule type configuration
 */
interface RuleTypeConfig {
  label: string;
  description: string;
  placeholder: string;
  icon: string;
  color: string;
}

/**
 * Regex example pattern
 */
interface RegexExample {
  name: string;
  pattern: string;
  description: string;
  explanation: string;
}

/**
 * Regex example category
 */
interface RegexCategory {
  category: string;
  examples: RegexExample[];
}

/**
 * Regex quick reference item
 */
interface RegexReferenceItem {
  symbol: string;
  meaning: string;
  example: string;
}

/**
 * Organization rule data
 */
interface OrganizationRule {
  id: number;
  name: string;
  rule_type: RuleTypeId;
  pattern: string;
  target_type: TargetType;
  target_id: string;
  priority: number;
  is_active: boolean | number;
  match_count?: number;
  exclude_pattern?: string;
}

/**
 * Folder data
 */
interface Folder {
  id: number;
  folder_number: string;
  name: string;
}

/**
 * Category data
 */
interface Category {
  id: number;
  number: number;
  name: string;
}

/**
 * Area data
 */
interface Area {
  id: number;
  range_start: number;
  range_end: number;
  name: string;
}

/**
 * Form data for rule modal
 */
interface RuleFormData {
  name: string;
  rule_type: RuleTypeId;
  pattern: string;
  target_type: TargetType;
  target_id: string;
  priority: number;
  is_active: boolean;
  exclude_pattern: string;
  // Compound rule fields
  compound_extension: string;
  compound_keyword: string;
}

/**
 * Test result for regex pattern
 */
interface TestResult {
  matches: boolean;
  error: string | null;
}

/**
 * Props for RegexHelper
 */
interface RegexHelperProps {
  pattern: string;
  onSelectPattern: (pattern: string) => void;
}

/**
 * Props for RuleCard
 */
interface RuleCardProps {
  rule: OrganizationRule;
  folders: Folder[];
  onEdit: (rule: OrganizationRule) => void;
  onDelete: (rule: OrganizationRule) => void;
  onToggle: (rule: OrganizationRule) => void;
}

/**
 * Props for RuleModal
 */
interface RuleModalProps {
  isOpen: boolean;
  rule: OrganizationRule | null;
  folders: Folder[];
  onSave: (data: RuleFormData & { id?: number }) => void;
  onClose: () => void;
}

// =============================================================================
// Icons
// =============================================================================

const Icons: Record<string, IconComponent> = {
  Plus: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Edit: (): JSX.Element => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  Trash: (): JSX.Element => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  X: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: (): JSX.Element => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ChevronDown: (): JSX.Element => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
};

// =============================================================================
// Rule Type Configuration
// =============================================================================

const RULE_TYPES: Record<RuleTypeId, RuleTypeConfig> = {
  extension: {
    label: 'Extension',
    description: 'Match files by their extension (e.g., .pdf, .docx)',
    placeholder: 'pdf (without the dot)',
    icon: '📄',
    color: '#3B82F6',
  },
  keyword: {
    label: 'Keyword',
    description: 'Match files containing specific words in their name',
    placeholder: 'invoice, receipt, statement',
    icon: '🔤',
    color: '#10B981',
  },
  path: {
    label: 'Path',
    description: 'Match files in specific folder paths',
    placeholder: '/Downloads/Work/',
    icon: '📁',
    color: '#F59E0B',
  },
  regex: {
    label: 'Regex',
    description: 'Match files using regular expressions (advanced)',
    placeholder: '^IMG_\\d{4}\\.(jpg|png)$',
    icon: '🔧',
    color: '#8B5CF6',
  },
  compound: {
    label: 'Compound',
    description: 'Match files by BOTH extension AND keyword (most specific)',
    placeholder: 'Extension + keyword combination',
    icon: '🔗',
    color: '#EC4899',
  },
  date: {
    label: 'Date',
    description: 'Match files with date patterns in filename (e.g., 2024-01, Jan_2024)',
    placeholder: '2024-01 or year:2024,month:01',
    icon: '📅',
    color: '#06B6D4',
  },
};

// =============================================================================
// Regex Helper Configuration
// =============================================================================

const REGEX_EXAMPLES: RegexCategory[] = [
  {
    category: '📸 Photos & Screenshots',
    examples: [
      {
        name: 'iPhone Photos',
        pattern: '^IMG_\\d+\\.(jpg|jpeg|heic)$',
        description: 'Matches: IMG_1234.jpg, IMG_99999.heic',
        explanation: 'iPhone photos start with IMG_ followed by numbers',
      },
      {
        name: 'Screenshots',
        pattern: '^(Screenshot|Screen Shot).*\\.(png|jpg)$',
        description: 'Matches: Screenshot 2024-01-15.png',
        explanation: 'macOS/Windows screenshots',
      },
      {
        name: 'Date-named Photos',
        pattern: '^\\d{4}-\\d{2}-\\d{2}.*\\.(jpg|png|heic)$',
        description: 'Matches: 2024-01-15_vacation.jpg',
        explanation: 'Photos named with YYYY-MM-DD format',
      },
    ],
  },
  {
    category: '📄 Documents',
    examples: [
      {
        name: 'Invoices',
        pattern: '(invoice|inv|bill).*\\d+',
        description: 'Matches: Invoice_2024_001.pdf, inv-12345.pdf',
        explanation: 'Documents containing "invoice" and a number',
      },
      {
        name: 'Tax Documents',
        pattern: '(tax|w-?2|1099|w-?9).*\\d{4}',
        description: 'Matches: W2_2024.pdf, 1099-2023.pdf',
        explanation: 'Tax forms with year numbers',
      },
      {
        name: 'Receipts',
        pattern: '(receipt|rcpt).*\\.(pdf|jpg|png)$',
        description: 'Matches: receipt_amazon.pdf, RCPT123.jpg',
        explanation: 'Receipt files in common formats',
      },
      {
        name: 'Contracts & Agreements',
        pattern: '(contract|agreement|nda|tos).*\\.pdf$',
        description: 'Matches: contract_signed.pdf, NDA_2024.pdf',
        explanation: 'Legal documents as PDFs',
      },
    ],
  },
  {
    category: '💼 Work Files',
    examples: [
      {
        name: 'Meeting Notes',
        pattern: '(meeting|notes|minutes).*\\d{4}',
        description: 'Matches: meeting_notes_2024-01.txt',
        explanation: 'Meeting notes with dates',
      },
      {
        name: 'Reports',
        pattern: '(report|summary|analysis).*Q[1-4]',
        description: 'Matches: Q4_Report_2024.xlsx',
        explanation: 'Quarterly reports',
      },
      {
        name: 'Presentations',
        pattern: '.*\\.(pptx?|key)$',
        description: 'Matches: any .ppt, .pptx, .key files',
        explanation: 'PowerPoint and Keynote files',
      },
    ],
  },
  {
    category: '🔧 Technical',
    examples: [
      {
        name: 'Log Files',
        pattern: '.*\\d{4}-\\d{2}-\\d{2}.*\\.log$',
        description: 'Matches: app_2024-01-15.log',
        explanation: 'Log files with date stamps',
      },
      {
        name: 'Backup Files',
        pattern: '.*\\.(bak|backup|old)$',
        description: 'Matches: document.bak, config.old',
        explanation: 'Backup and temporary files',
      },
      {
        name: 'Versioned Files',
        pattern: '.*_v\\d+\\.',
        description: 'Matches: design_v2.psd, report_v15.docx',
        explanation: 'Files with version numbers',
      },
    ],
  },
];

const REGEX_QUICK_REFERENCE: RegexReferenceItem[] = [
  { symbol: '.', meaning: 'Any single character', example: 'a.c → abc, aXc' },
  { symbol: '*', meaning: 'Zero or more of previous', example: 'ab* → a, ab, abbb' },
  { symbol: '+', meaning: 'One or more of previous', example: 'ab+ → ab, abbb' },
  { symbol: '?', meaning: 'Zero or one of previous', example: 'colou?r → color, colour' },
  { symbol: '\\d', meaning: 'Any digit (0-9)', example: '\\d{4} → 2024' },
  { symbol: '\\w', meaning: 'Letter, digit, or underscore', example: '\\w+ → file_1' },
  { symbol: '^', meaning: 'Start of filename', example: '^IMG → must start with IMG' },
  { symbol: '$', meaning: 'End of filename', example: '\\.pdf$ → must end with .pdf' },
  { symbol: '(a|b)', meaning: 'Either a or b', example: '\\.(jpg|png)$ → .jpg or .png' },
  { symbol: '[abc]', meaning: 'Any character in brackets', example: '[0-9] → any digit' },
  { symbol: '\\', meaning: 'Escape special characters', example: '\\. → literal dot' },
];

// =============================================================================
// Regex Helper Component
// =============================================================================

function RegexHelper({ pattern, onSelectPattern }: RegexHelperProps): JSX.Element {
  const [showExamples, setShowExamples] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [testFilename, setTestFilename] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [copiedPattern, setCopiedPattern] = useState<string | null>(null);

  // Test the pattern against a filename
  const testPattern = useCallback((): void => {
    if (!pattern || !testFilename) {
      setTestResult(null);
      return;
    }
    try {
      const regex = new RegExp(pattern, 'i');
      const matches = regex.test(testFilename);
      setTestResult({ matches, error: null });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setTestResult({ matches: false, error: errorMessage });
    }
  }, [pattern, testFilename]);

  // Test on every change
  useEffect(() => {
    testPattern();
  }, [testPattern]);

  const copyPattern = (p: string): void => {
    onSelectPattern(p);
    setCopiedPattern(p);
    setTimeout(() => setCopiedPattern(null), 2000);
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Pattern Tester */}
      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-300">🧪 Test Your Pattern</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={testFilename}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTestFilename(e.target.value)}
            placeholder="Enter a filename to test..."
            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded
              text-sm text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>
        {testFilename && pattern && (
          <div
            className={`mt-2 text-sm flex items-center gap-2 ${
              testResult?.error
                ? 'text-red-400'
                : testResult?.matches
                  ? 'text-green-400'
                  : 'text-yellow-400'
            }`}
          >
            {testResult?.error ? (
              <>⚠️ Invalid regex: {testResult.error}</>
            ) : testResult?.matches ? (
              <>✅ Pattern matches &quot;{testFilename}&quot;</>
            ) : (
              <>❌ Pattern does not match &quot;{testFilename}&quot;</>
            )}
          </div>
        )}
      </div>

      {/* Quick Reference Toggle */}
      <button
        type="button"
        onClick={() => setShowReference(!showReference)}
        className="w-full text-left px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700
          hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">📖 Quick Reference</span>
          <span className="text-gray-400 text-xs">{showReference ? '▲ Hide' : '▼ Show'}</span>
        </div>
      </button>

      {showReference && (
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2 pr-3">Symbol</th>
                <th className="pb-2 pr-3">Meaning</th>
                <th className="pb-2">Example</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {REGEX_QUICK_REFERENCE.map((item, i) => (
                <tr key={i} className="border-t border-slate-700">
                  <td className="py-1.5 pr-3">
                    <code className="bg-slate-800 px-1.5 py-0.5 rounded text-teal-400">
                      {item.symbol}
                    </code>
                  </td>
                  <td className="py-1.5 pr-3 text-gray-400">{item.meaning}</td>
                  <td className="py-1.5 text-gray-500 font-mono text-xs">{item.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Examples Toggle */}
      <button
        type="button"
        onClick={() => setShowExamples(!showExamples)}
        className="w-full text-left px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700
          hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">📋 Ready-to-Use Patterns</span>
          <span className="text-gray-400 text-xs">{showExamples ? '▲ Hide' : '▼ Show'}</span>
        </div>
      </button>

      {showExamples && (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {REGEX_EXAMPLES.map((category, catIdx) => (
            <div key={catIdx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <h5 className="text-sm font-medium text-white mb-2">{category.category}</h5>
              <div className="space-y-2">
                {category.examples.map((ex, exIdx) => (
                  <div
                    key={exIdx}
                    className="p-2 bg-slate-800 rounded hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-200">{ex.name}</span>
                      <button
                        type="button"
                        onClick={() => copyPattern(ex.pattern)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          copiedPattern === ex.pattern
                            ? 'bg-green-600 text-white'
                            : 'bg-teal-600 hover:bg-teal-500 text-white'
                        }`}
                      >
                        {copiedPattern === ex.pattern ? '✓ Used' : 'Use this'}
                      </button>
                    </div>
                    <code className="block text-xs bg-slate-900 px-2 py-1 rounded text-teal-400 mb-1 font-mono">
                      {ex.pattern}
                    </code>
                    <p className="text-xs text-gray-400">{ex.description}</p>
                    <p className="text-xs text-gray-500 italic mt-0.5">{ex.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="text-xs text-gray-500 bg-slate-900/30 rounded p-2">
        <strong className="text-gray-400">💡 Tip:</strong> Patterns are case-insensitive and match
        anywhere in the filename. Use <code className="text-teal-400">^</code> to match the start
        and <code className="text-teal-400">$</code> to match the end.
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Rule card displaying a single rule.
 */
function RuleCard({ rule, folders, onEdit, onDelete, onToggle }: RuleCardProps): JSX.Element {
  const typeConfig = RULE_TYPES[rule.rule_type] || RULE_TYPES.keyword;
  const targetFolder = folders.find((f) => f.folder_number === rule.target_id);

  return (
    <div
      className={`
      bg-slate-800 rounded-lg p-4 border-l-4 transition-opacity
      ${rule.is_active ? 'opacity-100' : 'opacity-50'}
    `}
      style={{ borderLeftColor: typeConfig.color }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeConfig.icon}</span>
            <h4 className="font-medium text-white">{rule.name}</h4>
            {!rule.is_active && (
              <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-gray-400">
                Disabled
              </span>
            )}
          </div>

          {/* Pattern */}
          <div className="text-sm text-gray-400 mb-2">
            <span className="text-gray-500">{typeConfig.label}:</span>{' '}
            <code className="bg-slate-900 px-2 py-0.5 rounded text-teal-400">{rule.pattern}</code>
          </div>

          {/* Target */}
          <div className="text-sm text-gray-400">
            <span className="text-gray-500">→</span>{' '}
            {targetFolder ? (
              <span className="text-white">
                {targetFolder.folder_number} {targetFolder.name}
              </span>
            ) : (
              <span className="text-yellow-400">
                {rule.target_type}: {rule.target_id}
              </span>
            )}
          </div>

          {/* Stats */}
          {rule.match_count && rule.match_count > 0 && (
            <div className="text-xs text-gray-500 mt-2">
              Matched {rule.match_count} file{rule.match_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(rule)}
            className={`p-2 rounded-md transition-colors ${
              rule.is_active
                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
            }`}
            title={rule.is_active ? 'Disable rule' : 'Enable rule'}
          >
            <Icons.Check />
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="p-2 hover:bg-slate-700 rounded-md text-gray-400 hover:text-white transition-colors"
            title="Edit rule"
          >
            <Icons.Edit />
          </button>
          <button
            onClick={() => onDelete(rule)}
            className="p-2 hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-400 transition-colors"
            title="Delete rule"
          >
            <Icons.Trash />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal for creating/editing rules.
 */
function RuleModal({
  isOpen,
  rule,
  folders,
  onSave,
  onClose,
}: RuleModalProps): JSX.Element | null {
  const isEditing = !!rule?.id;

  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    rule_type: 'extension',
    pattern: '',
    target_type: 'folder',
    target_id: '',
    priority: 50,
    is_active: true,
    exclude_pattern: '',
    compound_extension: '',
    compound_keyword: '',
  });
  const [error, setError] = useState('');

  // Initialize form when rule changes
  useEffect(() => {
    if (rule) {
      // Parse compound pattern if editing a compound rule
      let compoundExt = '';
      let compoundKeyword = '';
      if (rule.rule_type === 'compound' && rule.pattern) {
        // Pattern format: ext:pdf,keyword:invoice
        const parts = rule.pattern.split(',');
        parts.forEach((part: string) => {
          if (part.startsWith('ext:')) {
            compoundExt = part.replace('ext:', '');
          } else if (part.startsWith('keyword:')) {
            compoundKeyword = compoundKeyword
              ? `${compoundKeyword}, ${part.replace('keyword:', '')}`
              : part.replace('keyword:', '');
          }
        });
      }

      setFormData({
        name: rule.name || '',
        rule_type: rule.rule_type || 'extension',
        pattern: rule.pattern || '',
        target_type: rule.target_type || 'folder',
        target_id: rule.target_id || '',
        priority: rule.priority || 50,
        is_active: rule.is_active !== false && rule.is_active !== 0,
        exclude_pattern: (rule as OrganizationRule & { exclude_pattern?: string }).exclude_pattern || '',
        compound_extension: compoundExt,
        compound_keyword: compoundKeyword,
      });
    } else {
      setFormData({
        name: '',
        rule_type: 'extension',
        pattern: '',
        target_type: 'folder',
        target_id: '',
        priority: 50,
        is_active: true,
        exclude_pattern: '',
        compound_extension: '',
        compound_keyword: '',
      });
    }
    setError('');
  }, [rule, isOpen]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (!formData.target_id) {
      setError('Please select a target folder');
      return;
    }

    // Build pattern based on rule type
    let pattern = formData.pattern.trim();
    let priority = formData.priority;

    if (formData.rule_type === 'compound') {
      // Validate compound fields
      if (!formData.compound_extension.trim() || !formData.compound_keyword.trim()) {
        setError('Compound rules require both extension and keyword');
        return;
      }
      // Build compound pattern: ext:pdf,keyword:invoice,keyword:receipt
      const ext = formData.compound_extension.trim().replace(/^\./, '').toLowerCase();
      const keywords = formData.compound_keyword
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);
      pattern = `ext:${ext},${keywords.map((k) => `keyword:${k}`).join(',')}`;
      priority = 70; // Compound rules are most specific
    } else if (formData.rule_type === 'extension') {
      // Remove leading dot if present
      if (!pattern) {
        setError('Pattern is required');
        return;
      }
      pattern = pattern.replace(/^\./, '').toLowerCase();
    } else if (!pattern) {
      setError('Pattern is required');
      return;
    }

    onSave({
      ...formData,
      pattern,
      priority,
      exclude_pattern: formData.exclude_pattern.trim() || undefined,
      id: rule?.id,
    });
  };

  const typeConfig = RULE_TYPES[formData.rule_type];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Rule' : 'Create Rule'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-md transition-colors">
            <Icons.X />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rule Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., PDFs to Documents"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md
                text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Rule Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Match By</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(RULE_TYPES) as [RuleTypeId, RuleTypeConfig][]).map(
                ([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, rule_type: type, pattern: '' })}
                    className={`p-3 rounded-md border text-left transition-colors ${
                      formData.rule_type === type
                        ? 'border-teal-500 bg-teal-900/30'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span className="font-medium text-white">{config.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{config.description}</p>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Pattern - different UI for compound rules */}
          {formData.rule_type === 'compound' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Extension *
                </label>
                <input
                  type="text"
                  value={formData.compound_extension}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, compound_extension: e.target.value })
                  }
                  placeholder="pdf (without the dot)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md
                    text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1
                    focus:ring-teal-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Keywords * (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.compound_keyword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, compound_keyword: e.target.value })
                  }
                  placeholder="invoice, receipt, statement"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md
                    text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1
                    focus:ring-teal-500 font-mono"
                />
              </div>
              <p className="text-xs text-gray-500">
                Files must match BOTH the extension AND contain one of the keywords
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Pattern *</label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, pattern: e.target.value })
                }
                placeholder={typeConfig?.placeholder || 'Enter pattern...'}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md
                  text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1
                  focus:ring-teal-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">{typeConfig?.description}</p>

              {/* Regex Helper - only shown for regex type */}
              {formData.rule_type === 'regex' && (
                <RegexHelper
                  pattern={formData.pattern}
                  onSelectPattern={(p) => setFormData({ ...formData, pattern: p })}
                />
              )}
            </div>
          )}

          {/* Target Folder */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Send to Folder *</label>
            <select
              value={formData.target_id}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFormData({
                  ...formData,
                  target_id: e.target.value,
                  target_type: 'folder',
                })
              }
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md
                text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Select a folder...</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.folder_number}>
                  {folder.folder_number} - {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Priority: {formData.priority}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.priority}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Lower</span>
              <span>Higher (checked first)</span>
            </div>
          </div>

          {/* Exclude Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Exclude Pattern (optional)
            </label>
            <input
              type="text"
              value={formData.exclude_pattern}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, exclude_pattern: e.target.value })
              }
              placeholder="temp, backup, ~$ (comma-separated)"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md
                text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1
                focus:ring-teal-500 font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Skip files that contain any of these patterns (comma-separated)
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                formData.is_active ? 'bg-teal-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`
                absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                ${formData.is_active ? 'left-7' : 'left-1'}
              `}
              />
            </button>
            <span className="text-sm text-gray-300">
              {formData.is_active ? 'Rule is active' : 'Rule is disabled'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-md text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md
                font-medium transition-colors flex items-center gap-2"
            >
              <Icons.Check />
              {isEditing ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function RulesManager(): JSX.Element {
  // State
  const [rules, setRules] = useState<OrganizationRule[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  // Categories and areas loaded for future area/category targeting support
  const [_categories, setCategories] = useState<Category[]>([]);
  const [_areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRule, setEditingRule] = useState<OrganizationRule | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | RuleTypeId>('all');

  // Load data
  const loadData = useCallback((): void => {
    try {
      setRules(getOrganizationRules() as OrganizationRule[]);
      setFolders(getFolders() as Folder[]);
      setCategories(getCategories() as Category[]);
      setAreas(getAreas() as Area[]);
      setLoading(false);
    } catch (e) {
      const errorMsg = e instanceof Error ? e : String(e);
      setError(sanitizeErrorForUser(errorMsg));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleCreateRule = (): void => {
    setEditingRule(null);
    setShowModal(true);
  };

  const handleEditRule = (rule: OrganizationRule): void => {
    setEditingRule(rule);
    setShowModal(true);
  };

  const handleSaveRule = (ruleData: RuleFormData & { id?: number }): void => {
    try {
      if (ruleData.id) {
        updateOrganizationRule(ruleData.id, ruleData);
      } else {
        createOrganizationRule(ruleData);
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      const errorMsg = e instanceof Error ? e : String(e);
      setError(sanitizeErrorForUser(errorMsg));
    }
  };

  const handleDeleteRule = (rule: OrganizationRule): void => {
    if (window.confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) {
      try {
        deleteOrganizationRule(rule.id);
        loadData();
      } catch (e) {
        const errorMsg = e instanceof Error ? e : String(e);
        setError(sanitizeErrorForUser(errorMsg));
      }
    }
  };

  const handleToggleRule = (rule: OrganizationRule): void => {
    try {
      updateOrganizationRule(rule.id, { is_active: !rule.is_active });
      loadData();
    } catch (e) {
      const errorMsg = e instanceof Error ? e : String(e);
      setError(sanitizeErrorForUser(errorMsg));
    }
  };

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    if (filterType === 'all') return true;
    return rule.rule_type === filterType;
  });

  // Render
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-48"></div>
          <div className="h-24 bg-slate-700 rounded"></div>
          <div className="h-24 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Organization Rules</h2>
          <p className="text-gray-400 text-sm">Rules determine where files should be organized</p>
        </div>
        <button
          onClick={handleCreateRule}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md
            font-medium transition-colors flex items-center gap-2"
        >
          <Icons.Plus />
          New Rule
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            filterType === 'all'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          All ({rules.length})
        </button>
        {(Object.entries(RULE_TYPES) as [RuleTypeId, RuleTypeConfig][]).map(([type, config]) => {
          const count = rules.filter((r) => r.rule_type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1 ${
                filterType === type
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              {count > 0 && <span className="text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Rules List */}
      {filteredRules.length > 0 ? (
        <div className="space-y-3">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              folders={folders}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onToggle={handleToggleRule}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 bg-slate-800 rounded-lg text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-white mb-1">
            {filterType === 'all' ? 'No rules yet' : `No ${RULE_TYPES[filterType]?.label} rules`}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Rules help JDex automatically suggest where files should go
          </p>
          <button
            onClick={handleCreateRule}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md
              font-medium transition-colors inline-flex items-center gap-2"
          >
            <Icons.Plus />
            Create First Rule
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <h4 className="font-medium text-white mb-2">💡 Rule Tips</h4>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>
            <strong>Extension rules</strong> are great for file types (e.g., all PDFs → Documents)
          </li>
          <li>
            <strong>Keyword rules</strong> work well for specific content (e.g., &quot;invoice&quot;
            → Finance)
          </li>
          <li>
            <strong>Higher priority</strong> rules are checked first
          </li>
          <li>Disable rules temporarily without deleting them</li>
        </ul>
      </div>

      {/* Modal */}
      <RuleModal
        isOpen={showModal}
        rule={editingRule}
        folders={folders}
        onSave={handleSaveRule}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
