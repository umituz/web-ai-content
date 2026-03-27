/**
 * AI Generation Constants
 * Constants for AI content generation
 */

import type { AspectRatio, ImageQuality, VideoQuality } from '../types/GenerationTypes';

/**
 * Aspect ratio options
 */
export const ASPECT_RATIO_OPTIONS: Array<{ value: AspectRatio; label: string; width: number; height: number }> = [
  { value: '1:1', label: 'Square', width: 1024, height: 1024 },
  { value: '16:9', label: 'Landscape', width: 1920, height: 1080 },
  { value: '9:16', label: 'Portrait', width: 1080, height: 1920 },
  { value: '4:3', label: 'Standard', width: 1440, height: 1080 },
  { value: '3:4', label: 'Tall', width: 1080, height: 1440 },
] as const;

/**
 * Image quality options
 */
export const IMAGE_QUALITY_OPTIONS: Array<{ value: ImageQuality; label: string; description: string }> = [
  { value: 'standard', label: 'Standard', description: '1024x1024, good quality' },
  { value: 'hd', label: 'HD', description: '1920x1080, high quality' },
  { value: '4k', label: '4K', description: '3840x2160, ultra quality' },
] as const;

/**
 * Video quality options
 */
export const VIDEO_QUALITY_OPTIONS: Array<{ value: VideoQuality; label: string; resolution: string }> = [
  { value: '720p', label: '720p HD', resolution: '1280x720' },
  { value: '1080p', label: '1080p Full HD', resolution: '1920x1080' },
  { value: '4k', label: '4K Ultra HD', resolution: '3840x2160' },
] as const;

/**
 * Video duration options (in seconds)
 */
export const VIDEO_DURATION_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * Motion strength options
 */
export const MOTION_OPTIONS = [
  { value: 'slow', label: 'Slow', description: 'Gentle movement' },
  { value: 'medium', label: 'Medium', description: 'Balanced motion' },
  { value: 'fast', label: 'Fast', description: 'Dynamic movement' },
] as const;

/**
 * Style presets for image generation
 */
export const STYLE_PRESETS = [
  { value: 'realistic', label: 'Realistic', emoji: '📷', prompt: 'realistic, photograph, detailed' },
  { value: 'artistic', label: 'Artistic', emoji: '🎨', prompt: 'artistic, painting, creative' },
  { value: 'anime', label: 'Anime', emoji: '🎌', prompt: 'anime style, manga, vibrant colors' },
  { value: 'cinematic', label: 'Cinematic', emoji: '🎬', prompt: 'cinematic, movie scene, dramatic lighting' },
  { value: 'vintage', label: 'Vintage', emoji: '📜', prompt: 'vintage, retro, film grain' },
  { value: 'fantasy', label: 'Fantasy', emoji: '✨', prompt: 'fantasy, magical, ethereal' },
  { value: 'minimalist', label: 'Minimalist', emoji: '◻️', prompt: 'minimalist, clean, simple' },
  { value: 'abstract', label: 'Abstract', emoji: '🔶', prompt: 'abstract, geometric, artistic' },
] as const;

/**
 * Get dimensions for aspect ratio
 */
export function getDimensionsForAspectRatio(aspectRatio: AspectRatio): { width: number; height: number } {
  const option = ASPECT_RATIO_OPTIONS.find(opt => opt.value === aspectRatio);
  return option ? { width: option.width, height: option.height } : { width: 1024, height: 1024 };
}

/**
 * Get recommended quality based on aspect ratio
 */
export function getRecommendedQuality(aspectRatio: AspectRatio): ImageQuality | VideoQuality {
  if (aspectRatio === '16:9' || aspectRatio === '4:3') {
    return 'hd';
  }
  return 'standard';
}
