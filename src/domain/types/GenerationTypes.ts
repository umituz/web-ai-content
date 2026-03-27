/**
 * AI Generation Types
 * Types and constants for AI content generation
 */

/**
 * Generation type categories
 */
export type GenerationType = 'text-to-image' | 'image-to-image' | 'image-to-video' | 'text-to-video';

/**
 * Image quality levels
 */
export type ImageQuality = 'standard' | 'hd' | '4k';

/**
 * Video quality levels
 */
export type VideoQuality = '720p' | '1080p' | '4k';

/**
 * Aspect ratio options
 */
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

/**
 * Generation status
 */
export type GenerationStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Image generation request
 */
export interface ImageGenerationInput {
  type: 'text-to-image' | 'image-to-image';
  prompt: string;
  image?: string; // For image-to-image: base64 or URL
  aspectRatio?: AspectRatio;
  quality?: ImageQuality;
  style?: string;
  seed?: number;
}

/**
 * Video generation request
 */
export interface VideoGenerationInput {
  type: 'text-to-video' | 'image-to-video';
  prompt: string;
  image?: string; // For image-to-video: base64 or URL
  duration?: number; // in seconds
  aspectRatio?: AspectRatio;
  quality?: VideoQuality;
  motion?: 'slow' | 'medium' | 'fast';
}

/**
 * Generation result
 */
export interface GenerationResult {
  id: string;
  type: GenerationType;
  url: string;
  thumbnailUrl?: string;
  status: GenerationStatus;
  error?: string;
  metadata?: GenerationMetadata;
  createdAt: string;
}

/**
 * Generation metadata
 */
export interface GenerationMetadata {
  provider: 'pruna' | 'fal' | 'groq' | 'gemini';
  model: string;
  prompt: string;
  duration?: number;
  quality?: string;
  aspectRatio?: string;
  style?: string;
}

/**
 * Generation progress
 */
export interface GenerationProgress {
  stage: 'uploading' | 'processing' | 'polling';
  progress: number; // 0-100
  message?: string;
}

/**
 * Credit cost configuration
 */
export interface CreditCost {
  standard: number;
  hd: number;
  '4k': number;
}

/**
 * Generation cost by type
 */
export const GENERATION_COSTS: Record<GenerationType, CreditCost> = {
  'text-to-image': { standard: 1, hd: 2, '4k': 4 },
  'image-to-image': { standard: 1, hd: 2, '4k': 4 },
  'image-to-video': { standard: 3, hd: 5, '4k': 8 },
  'text-to-video': { standard: 5, hd: 8, '4k': 12 },
} as const;

/**
 * Calculate credit cost for generation
 */
export function calculateCreditCost(
  type: GenerationType,
  quality: ImageQuality | VideoQuality = 'standard',
): number {
  const costConfig = GENERATION_COSTS[type];
  if (quality in costConfig) {
    return costConfig[quality as keyof CreditCost];
  }
  return costConfig.standard;
}
