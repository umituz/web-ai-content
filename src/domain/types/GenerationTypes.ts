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
 * Re-export the canonical credit-cost map and calculator from
 * domain/calculations/ContentCreditCost. Kept here for backward
 * compatibility with existing consumers.
 */
export { CREDIT_COSTS as GENERATION_COSTS, calculateContentCreditCost as calculateCreditCost } from '../calculations/ContentCreditCost';
