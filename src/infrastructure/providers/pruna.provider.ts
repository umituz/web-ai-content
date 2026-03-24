/**
 * Pruna AI Provider
 * Image and video generation using Pruna AI
 */

import { BaseAIProvider, type GeneratedContent } from './base.provider';
import type { PrunaConfig, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

/**
 * Pruna API response
 */
interface PrunaResponse {
  id: string;
  status: string;
  output?: {
    url?: string;
    text?: string;
  };
  error?: string;
}

/**
 * Pruna Provider Implementation
 */
export class PrunaProvider extends BaseAIProvider {
  readonly id = 'pruna';
  readonly name = 'Pruna AI';
  readonly type = 'multimodal' as const;

  private models = {
    textToImage: 'stable-diffusion-xl',
    textToVideo: 'zeroscope',
  };

  constructor(config: PrunaConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.pruna.ai',
      timeout: config.timeout || 120000,
      retryAttempts: config.retryAttempts || 2,
    });

    if (config.models) {
      this.models = { ...this.models, ...config.models };
    }
  }

  /**
   * Health check for Pruna
   */
  async healthCheck(): Promise<'healthy' | 'degraded' | 'exhausted' | 'unavailable'> {
    try {
      if (!this.config.apiKey) {
        return 'unavailable';
      }

      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/v1/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        }
      );

      return response.ok ? 'healthy' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * Estimate cost for Pruna
   */
  async estimateCost(_request: ImageGenerationRequest | VideoGenerationRequest): Promise<number> {
    // Pruna pricing varies, return estimate
    return 1;
  }

  /**
   * Generate image using Pruna
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/v1/generate/image`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.models.textToImage,
              prompt: request.prompt,
              size: this.getFormatSize(request.format),
              num_inference_steps: this.getQualitySteps(request.quality),
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`Pruna API error: ${response.statusText}`);
      }

      const data: PrunaResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        id: data.id,
        type: 'image',
        url: data.output?.url,
        metadata: {
          provider: 'pruna',
          model: this.models.textToImage,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Pruna image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate video using Pruna
   */
  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/v1/generate/video`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.models.textToVideo,
              prompt: request.prompt,
              duration: request.duration || 5,
              aspect_ratio: request.aspectRatio || '16:9',
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`Pruna API error: ${response.statusText}`);
      }

      const data: PrunaResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        id: data.id,
        type: 'video',
        url: data.output?.url,
        metadata: {
          provider: 'pruna',
          model: this.models.textToVideo,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Pruna video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pruna doesn't support text generation
   */
  async generateText(_request: TextGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Pruna provider does not support text generation');
  }

  /**
   * Pruna doesn't support image-to-video
   */
  async imageToVideo(_request: ImageToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Pruna provider does not support image-to-video conversion');
  }

  /**
   * Pruna doesn't support video-to-video
   */
  async videoToVideo(_request: VideoToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Pruna provider does not support video-to-video conversion');
  }

  /**
   * Helper: Get format size
   */
  private getFormatSize(format?: string): string {
    const sizeMap: Record<string, string> = {
      square: '1024x1024',
      landscape: '1920x1080',
      portrait: '1080x1920',
      story: '1080x1920',
      banner: '1920x1080',
    };
    return sizeMap[format || 'square'] || '1024x1024';
  }

  /**
   * Helper: Get quality steps
   */
  private getQualitySteps(quality?: string): number {
    const qualityMap: Record<string, number> = {
      standard: 20,
      high: 30,
      ultra: 50,
    };
    return qualityMap[quality || 'high'] || 30;
  }
}

/**
 * Create a Pruna provider
 */
export function createPrunaProvider(config: PrunaConfig): PrunaProvider {
  return new PrunaProvider(config);
}
