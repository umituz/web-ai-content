/**
 * Speech Pace Estimate
 * Pure conversions between human-readable durations and LLM token budgets
 * (and word counts) for video/voice scripts.
 */

import { SpeechPaceConfig } from '../limits/SpeechPaceConfig';

/** Approximate number of spoken words for a given duration. */
export function estimateWordCountForDuration(durationSeconds: number): number {
  return Math.floor(durationSeconds * SpeechPaceConfig.WORDS_PER_SECOND);
}

/** Approximate max_tokens budget for a given duration. */
export function estimateTokenBudgetForDuration(durationSeconds: number): number {
  return durationSeconds * SpeechPaceConfig.TOKENS_PER_SECOND;
}

/** Approximate max_tokens budget for a content calendar of N days. */
export function estimateTokenBudgetForCalendarDays(days: number): number {
  return days * SpeechPaceConfig.TOKENS_PER_CALENDAR_DAY;
}
