/**
 * Content Calendar Date Offset
 * Pure math that converts a "day index" (1-based) into a concrete Date
 * offset from "now" in milliseconds.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function resolveCalendarEntryDate(dayIndex: number, baseTimestamp: number = Date.now()): Date {
  return new Date(baseTimestamp + (dayIndex - 1) * ONE_DAY_MS);
}
