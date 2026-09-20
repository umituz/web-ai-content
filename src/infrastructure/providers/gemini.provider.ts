/**
 * Google Gemini Provider
 * Text and image generation using Google's Gemini API
 */

import { BaseAIProvider, type GeneratedContent } from './base.provider';
import { ProviderTimingConfig } from '../../domain/limits/ProviderTimingConfig';
import { estimateGeminiGenerationCost } from '../../domain/predicates/ProviderCostEstimator';
import { ModelDefaults } from '../../domain/limits/ModelDefaults';
import type { GeminiConfig, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

/**
 * Gemini API response
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          data: string;
          mimeType: string;
        };
      }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Gemini Provider Implementation
 */
export class GeminiProvider extends BaseAIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type = 'multimodal' as const;

  private models: { text: string; image: string; video?: string } = {
    text: ModelDefaults.GEMINI_TEXT,
    image: ModelDefaults.GEMINI_IMAGE,
  };

  constructor(config: GeminiConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      timeout: config.timeout || ProviderTimingConfig.GEMINI_TIMEOUT_MS,
      retryAttempts: config.retryAttempts || ProviderTimingConfig.GEMINI_RETRY_ATTEMPTS,
    });

    if (config.models) {
      this.models = { ...this.models, ...config.models };
    }
  }

  /**
   * Health check for Gemini
   */
  async healthCheck(): Promise<'healthy' | 'degraded' | 'exhausted' | 'unavailable'> {
    try {
      if (!this.config.apiKey) {
        return 'unavailable';
      }

      // List models — a free, side-effect-free reachability check.
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.authHeaders(),
        }
      );

      return response.ok ? 'healthy' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * Auth headers — the API key travels in a header, never in the URL
   * (query strings are routinely captured in logs and proxies).
   */
  private authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.config.apiKey,
    };
  }

  /**
   * Estimate cost for Gemini (uses Google AI pricing)
   */
  async estimateCost(request: TextGenerationRequest | ImageGenerationRequest): Promise<number> {
    return estimateGeminiGenerationCost(request);
  }

  /**
   * Generate text using Gemini
   */
  async generateText(request: TextGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/models/${this.models.text}:generateContent`,
          {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({
              contents: [{
                parts: [{ text: request.prompt }]
              }],
              generationConfig: {
                temperature: request.temperature || 0.7,
                maxOutputTokens: request.maxTokens || 2048,
                topP: request.topP || 0.9,
              },
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();

      return {
        id: Date.now().toString(),
        type: 'text',
        content: data.candidates[0]?.content?.parts[0]?.text || '',
        metadata: {
          model: this.models.text,
          usage: data.usageMetadata,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Gemini text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image using Gemini Imagen
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/models/${this.models.image}:generateContent`,
          {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: this.buildImagePrompt(request)
                }]
              }],
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();

      const imageData = data.candidates[0]?.content?.parts[0]?.inlineData;
      if (!imageData) {
        throw new Error('No image data in response');
      }

      // Embed as a data URL: portable across browser/Node/React Native and,
      // unlike URL.createObjectURL, holds no global resource to revoke.
      const url = `data:${imageData.mimeType};base64,${imageData.data}`;

      return {
        id: Date.now().toString(),
        type: 'image',
        url,
        metadata: {
          provider: 'gemini',
          model: this.models.image,
          mimeType: imageData.mimeType,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Gemini image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gemini doesn't support video generation
   */
  async generateVideo(_request: VideoGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Gemini provider does not support video generation');
  }

  /**
   * Gemini doesn't support image-to-video
   */
  async imageToVideo(_request: ImageToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Gemini provider does not support image-to-video conversion');
  }

  /**
   * Gemini doesn't support video-to-video
   */
  async videoToVideo(_request: VideoToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Gemini provider does not support video-to-video conversion');
  }

  /**
   * Build image prompt with style modifiers
   */
  private buildImagePrompt(request: ImageGenerationRequest): string {
    let prompt = request.prompt;

    // Add style
    if (request.style) {
      const styles: Record<string, string> = {
        realistic: 'photorealistic, highly detailed, 8k resolution',
        cartoon: 'cartoon style, colorful, animated',
        abstract: 'abstract art, modern, artistic',
        minimalist: 'minimalist, clean, simple',
        vintage: 'vintage style, retro, classic',
      };
      prompt += `, ${styles[request.style]}`;
    }

    // Add quality
    if (request.quality === 'ultra') {
      prompt += ', ultra high quality, masterpiece';
    }

    return prompt;
  }
}

/**
 * Create a Gemini provider
 */
export function createGeminiProvider(config: GeminiConfig): GeminiProvider {
  return new GeminiProvider(config);
}
