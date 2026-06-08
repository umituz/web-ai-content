/**
 * Quality Recommender by Aspect Ratio
 * Pure decision function: chooses an image/video quality tier based on
 * the aspect ratio. Wide ratios suggest HD; others default to standard.
 */

import type { AspectRatio, ImageQuality, VideoQuality } from '../limits/ImageFormatOptions';

const WIDE_RATIOS: ReadonlySet<AspectRatio> = new Set(['16:9', '4:3']);

export function recommendQualityForAspectRatio(
  ratio: AspectRatio,
): ImageQuality | VideoQuality {
  return WIDE_RATIOS.has(ratio) ? 'hd' : 'standard';
}
