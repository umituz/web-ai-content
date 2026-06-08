/**
 * Hashtag Priority Ranker
 * Pure decision + sort: trims a hashtag list to a platform's max and
 * keeps the most specific (longer) tags first.
 */

import type { SocialPlatform } from '../types';
import { PLATFORM_SPECS } from '../types';

export const DEFAULT_HASHTAG_BUDGET: number = Number.MAX_SAFE_INTEGER;

/**
 * Returns the platform-specific max hashtag count, or unlimited when the
 * platform isn't in the spec table.
 */
export function resolveHashtagBudget(platform: SocialPlatform): number {
  return PLATFORM_SPECS[platform]?.maxHashtags ?? DEFAULT_HASHTAG_BUDGET;
}

/**
 * Rank hashtags by length (longer = more specific) and trim to budget.
 * Returns a new array; does not mutate the input.
 */
export function rankAndTrimHashtags(hashtags: ReadonlyArray<string>, budget: number): string[] {
  if (hashtags.length <= budget) return [...hashtags];
  return [...hashtags].sort((a, b) => b.length - a.length).slice(0, budget);
}
