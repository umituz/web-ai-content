/**
 * Google Gemini Provider
 * Text and image generation using Google's Gemini API
 */

import { BaseAIProvider, type GeneratedContent } from './base.provider';
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

  private models = {
    text: 'gemini-2.0-flash',
    image: 'imagen-4.0-generate-001',
  };

  constructor(config: GeminiConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      timeout: config.timeout || 60000,
      retryAttempts: config.retryAttempts || 3,
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

      // Simple health check - try to generate
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/models/${this.models.text}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'test' }]
            }]
          }),
        }
      );

      return response.ok ? 'healthy' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * Estimate cost for Gemini (uses Google AI pricing)
   */
  async estimateCost(request: TextGenerationRequest | ImageGenerationRequest): Promise<number> {
    // Gemini pricing is complex, return estimated cost
    // This is a simplified estimation
    if (request.type === 'image') {
      return 0.02; // ~$0.02 per image
    }
    return 0.0001; // ~$0.0001 per 1K characters
  }

  /**
   * Generate text using Gemini
   */
  async generateText(request: TextGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/models/${this.models.text}:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
          `${this.config.baseUrl}/models/${this.models.image}:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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

      // Convert base64 to blob URL
      const byteCharacters = atob(imageData.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: imageData.mimeType });
      const url = URL.createObjectURL(blob);

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
