/**
 * Groq AI Provider
 * Fast LPU inference for text generation
 */

import { BaseAIProvider, type GeneratedContent } from './base.provider';
import type { GroqConfig, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

/**
 * Groq API response
 */
interface GroqApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Groq Provider Implementation
 */
export class GroqProvider extends BaseAIProvider {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly type = 'text' as const;

  private defaultModel = 'llama-3.3-70b-versatile';

  constructor(config: GroqConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
    });
    this.defaultModel = config.models?.text || this.defaultModel;
  }

  /**
   * Health check for Groq
   */
  async healthCheck(): Promise<'healthy' | 'degraded' | 'exhausted' | 'unavailable'> {
    try {
      if (!this.config.apiKey) {
        return 'unavailable';
      }

      // Simple health check - try to list models
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/models`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok ? 'healthy' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * Estimate cost for Groq (they offer free tier)
   */
  async estimateCost(): Promise<number> {
    // Groq offers free tier, so cost is 0
    return 0;
  }

  /**
   * Generate text using Groq API
   */
  async generateText(request: TextGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: request.model || this.defaultModel,
              messages: [
                {
                  role: 'user',
                  content: request.prompt,
                },
              ],
              max_tokens: request.maxTokens || 2048,
              temperature: request.temperature || 0.7,
              top_p: request.topP || 0.9,
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const data: GroqApiResponse = await response.json();

      return {
        id: data.id,
        type: 'text',
        content: data.choices[0]?.message?.content || '',
        metadata: {
          model: data.model,
          usage: data.usage,
        },
        createdAt: new Date(data.created * 1000).toISOString(),
      };
    } catch (error) {
      throw new Error(`Groq text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Groq doesn't support image generation
   */
  async generateImage(_request: ImageGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support image generation');
  }

  /**
   * Groq doesn't support video generation
   */
  async generateVideo(_request: VideoGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support video generation');
  }

  /**
   * Groq doesn't support image-to-video
   */
  async imageToVideo(_request: ImageToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support image-to-video conversion');
  }

  /**
   * Groq doesn't support video-to-video
   */
  async videoToVideo(_request: VideoToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support video-to-video conversion');
  }
}

/**
 * Create a Groq provider
 */
export function createGroqProvider(config: GroqConfig): GroqProvider {
  return new GroqProvider(config);
}
