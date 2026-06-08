/**
 * Content Credit Cost
 * Pure functions for translating (generation type × quality) into a
 * credit cost. Costs are looked up in a configuration map that mirrors
 * the platform's pricing tiers.
 */

import type { GenerationType } from '../types/GenerationTypes';

export type QualityTier = 'standard' | 'hd' | '4k';

export const CREDIT_COSTS: Readonly<Record<GenerationType, Readonly<Record<QualityTier, number>>>> = {
  'text-to-image':   { standard: 1, hd: 2, '4k': 4 },
  'image-to-image':  { standard: 1, hd: 2, '4k': 4 },
  'image-to-video':  { standard: 3, hd: 5, '4k': 8 },
  'text-to-video':   { standard: 5, hd: 8, '4k': 12 },
} as const;

export const DEFAULT_CREDIT_COST: number = 0;

/**
 * Resolve the credit cost for a generation request.
 * Returns 0 (free) for unknown quality tiers.
 */
export function calculateContentCreditCost(
  type: GenerationType,
  quality: QualityTier = 'standard',
): number {
  const tierCosts = CREDIT_COSTS[type];
  if (!tierCosts) return DEFAULT_CREDIT_COST;
  return tierCosts[quality] ?? tierCosts.standard;
}
