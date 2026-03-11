/**
 * DateRangePicker Component
 * =========================
 * Custom date range picker with calendar, presets, and custom range support.
 * No external libraries - built with native Date APIs and date-fns.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  isSameDay,
  isAfter,
  isBefore,
  addMonths,
  getDay,
  getDaysInMonth,
} from 'date-fns';

// =============================================================================
// Preset Options
// =============================================================================

const PRESETS = [
  {
    key: '7days',
    label: 'Last 7 days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: '30days',
    label: 'Last 30 days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 29)),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: '90days',
    label: 'Last 90 days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 89)),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: 'thisMonth',
    label: 'This month',
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: 'lastMonth',
    label: 'Last month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    },
  },
  {
    key: 'thisYear',
    label: 'This year',
    getRange: () => ({
      start: startOfYear(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: 'allTime',
    label: 'All time',
    getRange: () => ({
      start: null,
      end: null,
    }),
  },
];

// =============================================================================
// Calendar Constants
// =============================================================================

const DAYS_OF_WEEK = Object.freeze(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);

// =============================================================================
// Calendar Component
// =============================================================================

function MiniCalendar({
  month,
  selectedStart,
  selectedEnd,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  isSecondCalendar,
}) {
  // Generate calendar days for the month
  const calendarDays = useMemo(() => {
    const days = [];
    const firstDay = startOfMonth(month);
    const daysInMonth = getDaysInMonth(month);
    const startDayOfWeek = getDay(firstDay);

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      days.push(date);
    }

    return days;
  }, [month]);

  const isSelected = (date) => {
    if (!date) return false;
    return (
      (selectedStart && isSameDay(date, selectedStart)) ||
      (selectedEnd && isSameDay(date, selectedEnd))
    );
  };

  const isInRange = (date) => {
    if (!date || !selectedStart || !selectedEnd) return false;
    return isAfter(date, selectedStart) && isBefore(date, selectedEnd);
  };

  const isDisabled = (date) => {
    if (!date) return true;
    return isAfter(date, new Date()); // Can't select future dates
  };

  return (
    <div className="w-64">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        {!isSecondCalendar ? (
          <button
            onClick={onPrevMonth}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
        ) : (
          <div className="w-8" />
        )}
        <span className="text-sm font-medium text-white">{format(month, 'MMMM yyyy')}</span>
        {isSecondCalendar ? (
          <button
            onClick={onNextMonth}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="text-center text-xs text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="w-8 h-8" />;
          }

          const selected = isSelected(date);
          const inRange = isInRange(date);
          const disabled = isDisabled(date);
          const isStart = selectedStart && isSameDay(date, selectedStart);
          const isEnd = selectedEnd && isSameDay(date, selectedEnd);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={date.toISOString()}
              onClick={() => !disabled && onSelectDate(date)}
              disabled={disabled}
              className={`
                w-8 h-8 text-sm rounded-lg transition-all relative
                ${disabled ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-700 cursor-pointer'}
                ${selected ? 'bg-purple-600 text-white font-medium' : ''}
                ${inRange ? 'bg-purple-500/20 text-purple-200' : ''}
                ${!selected && !inRange && !disabled ? 'text-slate-300' : ''}
                ${isToday && !selected ? 'ring-1 ring-purple-500/50' : ''}
                ${isStart ? 'rounded-r-none' : ''}
                ${isEnd ? 'rounded-l-none' : ''}
                ${inRange ? 'rounded-none' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Main DateRangePicker Component
// =============================================================================

export default function DateRangePicker({ value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempStart, setTempStart] = useState(null);
  const [tempEnd, setTempEnd] = useState(null);
  const [activePreset, setActivePreset] = useState('30days');
  const containerRef = useRef(null);

  // Initialize from value
  useEffect(() => {
    if (value?.start && value?.end) {
      setTempStart(value.start);
      setTempEnd(value.end);
      setCurrentMonth(value.start);

      // Try to detect preset
      const preset = PRESETS.find((p) => {
        const range = p.getRange();
        return (
          range.start &&
          range.end &&
          isSameDay(range.start, value.start) &&
          isSameDay(range.end, value.end)
        );
      });
      setActivePreset(preset?.key || 'custom');
    } else if (value?.start === null && value?.end === null) {
      setActivePreset('allTime');
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset) => {
    const range = preset.getRange();
    setTempStart(range.start);
    setTempEnd(range.end);
    setActivePreset(preset.key);
    onChange?.(range);
    setIsOpen(false);
  };

  const handleDateSelect = (date) => {
    // If no start date or both dates set, start a new selection
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(startOfDay(date));
      setTempEnd(null);
      setActivePreset('custom');
    } else {
      // Have start, selecting end
      if (isBefore(date, tempStart)) {
        // Selected date is before start, swap
        setTempEnd(endOfDay(tempStart));
        setTempStart(startOfDay(date));
      } else {
        setTempEnd(endOfDay(date));
      }
      setActivePreset('custom');
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange?.({ start: tempStart, end: tempEnd });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    setActivePreset('allTime');
    onChange?.({ start: null, end: null });
    setIsOpen(false);
  };

  const formatDisplayText = () => {
    if (activePreset === 'allTime') return 'All time';

    const preset = PRESETS.find((p) => p.key === activePreset);
    if (preset && activePreset !== 'custom') {
      return preset.label;
    }

    if (value?.start && value?.end) {
      return `${format(value.start, 'MMM d, yyyy')} - ${format(value.end, 'MMM d, yyyy')}`;
    }

    return 'Select dates';
  };

  const secondMonth = addMonths(currentMonth, 1);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-600/50
          rounded-xl text-sm text-white hover:border-slate-500 focus:border-purple-500
          focus:ring-1 focus:ring-purple-500/50 transition-all"
      >
        <Calendar size={16} className="text-slate-400" />
        <span className="min-w-32">{formatDisplayText()}</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700
          rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in"
        >
          <div className="flex">
            {/* Presets */}
            <div className="w-44 border-r border-slate-700 p-2">
              <div className="text-xs text-slate-500 px-2 py-1 mb-1">Quick select</div>
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
                    ${
                      activePreset === preset.key
                        ? 'bg-purple-600/20 text-purple-300'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                >
                  {preset.label}
                  {activePreset === preset.key && <Check size={14} className="text-purple-400" />}
                </button>
              ))}
            </div>

            {/* Calendars */}
            <div className="p-4">
              <div className="text-xs text-slate-500 mb-3">Custom range</div>
              <div className="flex gap-4">
                <MiniCalendar
                  month={currentMonth}
                  selectedStart={tempStart}
                  selectedEnd={tempEnd}
                  onSelectDate={handleDateSelect}
                  onPrevMonth={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                  onNextMonth={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                  isSecondCalendar={false}
                />
                <MiniCalendar
                  month={secondMonth}
                  selectedStart={tempStart}
                  selectedEnd={tempEnd}
                  onSelectDate={handleDateSelect}
                  onPrevMonth={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                  onNextMonth={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                  isSecondCalendar={true}
                />
              </div>

              {/* Selection display */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-400">
                    {tempStart && tempEnd ? (
                      <span>
                        {format(tempStart, 'MMM d, yyyy')} — {format(tempEnd, 'MMM d, yyyy')}
                      </span>
                    ) : tempStart ? (
                      <span>Select end date</span>
                    ) : (
                      <span>Select start date</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClear}
                      className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700
                        rounded-lg transition-colors text-sm"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={!tempStart || !tempEnd}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700
                        disabled:text-slate-500 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
