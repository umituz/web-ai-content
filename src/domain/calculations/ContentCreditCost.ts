/**
 * Content Credit Cost
 * Pure functions for translating (generation type × quality) into a
 * credit cost. Costs are looked up in a configuration map that mirrors
 * the platform's pricing tiers.
 */

import type { GenerationType } from '../types/GenerationTypes';
import type { ImageQuality, VideoQuality } from '../limits/ImageFormatOptions';

export type QualityTier = 'standard' | 'hd' | '4k';

export const CREDIT_COSTS: Readonly<Record<GenerationType, Readonly<Record<QualityTier, number>>>> = {
  'text-to-image':   { standard: 1, hd: 2, '4k': 4 },
  'image-to-image':  { standard: 1, hd: 2, '4k': 4 },
  'image-to-video':  { standard: 3, hd: 5, '4k': 8 },
  'text-to-video':   { standard: 5, hd: 8, '4k': 12 },
} as const;

export const DEFAULT_CREDIT_COST: number = 0;

/** Any quality vocabulary the platform uses, normalized to a pricing tier. */
export type AnyQuality = QualityTier | ImageQuality | VideoQuality;

/**
 * Normalize the platform's image/video quality vocabularies into the
 * pricing tiers used by CREDIT_COSTS.
 * Image tiers map identity; video resolutions map 720p→standard, 1080p→hd.
 */
export function toQualityTier(quality: AnyQuality | undefined): QualityTier {
  if (quality === '4k') return '4k';
  if (quality === 'hd' || quality === '1080p') return 'hd';
  return 'standard';
}

/**
 * Resolve the credit cost for a generation request.
 * Accepts any quality vocabulary; video resolutions are normalized
 * (720p→standard, 1080p→hd). Returns 0 (free) for unknown types.
 */
export function calculateContentCreditCost(
  type: GenerationType,
  quality: AnyQuality = 'standard',
): number {
  const tierCosts = CREDIT_COSTS[type];
  if (!tierCosts) return DEFAULT_CREDIT_COST;
  return tierCosts[toQualityTier(quality)] ?? tierCosts.standard;
}
