/**
 * Provider Configuration Types
 * Defines configuration for all AI providers
 */

/**
 * Provider health status
 */
export type ProviderHealth = 'healthy' | 'degraded' | 'exhausted' | 'unavailable';

/**
 * Provider type categories
 */
export type ProviderType = 'text' | 'image' | 'video' | 'multimodal';

/**
 * Base provider configuration
 */
export interface BaseProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Groq provider configuration
 */
export interface GroqConfig extends BaseProviderConfig {
  models?: {
    text?: string;
    chat?: string;
  };
}

/**
 * FAL provider configuration
 */
export interface FalConfig extends BaseProviderConfig {
  models?: {
    image?: string;
    video?: string;
    imageToVideo?: string;
  };
}

/**
 * Pruna provider configuration
 */
export interface PrunaConfig extends BaseProviderConfig {
  models?: {
    textToImage?: string;
    textToVideo?: string;
  };
}

/**
 * Gemini provider configuration
 */
export interface GeminiConfig extends BaseProviderConfig {
  models?: {
    text?: string;
    image?: string;
    video?: string;
  };
}

/**
 * Main provider configuration
 */
export interface ProviderConfig {
  // Priority order for providers (first = highest priority)
  priority: string[];

  // Individual provider configs
  groq?: GroqConfig;
  fal?: FalConfig;
  pruna?: PrunaConfig;
  gemini?: GeminiConfig;

  // Global settings
  fallbackEnabled: boolean;
  retryAttempts: number;
  timeout: number;
}

/**
 * Generation request base interface
 */
export interface GenerationRequest {
  type: 'text' | 'image' | 'video';
  provider?: string; // Override provider selection
}

/**
 * Text generation request
 */
export interface TextGenerationRequest extends GenerationRequest {
  type: 'text';
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Image generation request
 */
export interface ImageGenerationRequest extends GenerationRequest {
  type: 'image';
  prompt: string;
  style?: 'realistic' | 'cartoon' | 'abstract' | 'minimalist' | 'vintage';
  format?: 'square' | 'landscape' | 'portrait' | 'story' | 'banner';
  quality?: 'standard' | 'high' | 'ultra';
  quantity?: number;
}

/**
 * Video generation request
 */
export interface VideoGenerationRequest extends GenerationRequest {
  type: 'video';
  prompt: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: 'realistic' | 'animated' | 'cinematic' | 'documentary';
  quality?: 'standard' | 'high' | 'ultra';
}

/**
 * Image to video request
 */
export interface ImageToVideoRequest extends GenerationRequest {
  type: 'video';
  imageUrl: string;
  prompt?: string;
  duration?: number;
  motion?: 'slow' | 'medium' | 'fast';
  camera?: 'static' | 'pan' | 'zoom' | 'tracking';
}

/**
 * Video to video request
 */
export interface VideoToVideoRequest extends GenerationRequest {
  type: 'video';
  sourceVideoUrl: string;
  prompt: string;
  styleTransfer?: 'cinematic' | 'anime' | 'cartoon' | 'vintage';
  enhanceQuality?: boolean;
}

/**
 * Generated content result
 */
export interface GeneratedContent {
  id: string;
  type: 'text' | 'image' | 'video';
  url?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
