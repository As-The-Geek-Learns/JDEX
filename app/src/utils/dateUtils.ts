/**
 * Date Utilities
 * ==============
 * Utility functions for date manipulation and period calculations.
 */

/**
 * Date range with start and end dates.
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Get a previous period date range based on current range.
 * The previous period has the same duration as the current period,
 * ending the day before the current period starts.
 *
 * @param start - Current period start
 * @param end - Current period end
 * @returns Previous period range
 *
 * @example
 * // If current period is Feb 1-7 (7 days)
 * // Previous period will be Jan 25-31 (7 days)
 * getPreviousPeriodRange(new Date('2026-02-01'), new Date('2026-02-07'))
 */
export function getPreviousPeriodRange(
  start: Date | null | undefined,
  end: Date | null | undefined
): DateRange {
  if (!start || !end) return { start: null, end: null };

  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1); // Day before current start
  const previousStart = new Date(previousEnd.getTime() - duration);

  return { start: previousStart, end: previousEnd };
}
