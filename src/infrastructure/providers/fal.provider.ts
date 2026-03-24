/**
 * FAL AI Provider
 * Fast inference for image and video generation
 */

import { BaseAIProvider, type GeneratedContent } from './base.provider';
import type { FalConfig, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

/**
 * FAL API response structure
 */
interface FalQueueResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

interface FalResult {
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: string;
}

/**
 * FAL Provider Implementation
 */
export class FalProvider extends BaseAIProvider {
  readonly id = 'fal';
  readonly name = 'FAL';
  readonly type = 'multimodal' as const;

  private models = {
    image: 'fal-ai/flux/schnell',
    video: 'fal-ai/hunyuan-video/1',
    imageToVideo: 'fal-ai/fast-animatediff/image-to-video',
  };

  constructor(config: FalConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://queue.fal.run',
      timeout: config.timeout || 120000, // 2 minutes for generation
      retryAttempts: config.retryAttempts || 2,
    });

    if (config.models) {
      this.models = { ...this.models, ...config.models };
    }
  }

  /**
   * Health check for FAL
   */
  async healthCheck(): Promise<'healthy' | 'degraded' | 'exhausted' | 'unavailable'> {
    try {
      if (!this.config.apiKey) {
        return 'unavailable';
      }

      // Simple health check
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/fal-ai/flux/schnell/status`,
        {
          method: 'HEAD',
          headers: {
            'Authorization': `Key ${this.config.apiKey}`,
          },
        }
      );

      return response.ok ? 'healthy' : 'degraded';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * FAL doesn't provide cost estimation
   */
  async estimateCost(_request: ImageGenerationRequest | VideoGenerationRequest): Promise<number> {
    // FAL uses credit-based system, return 1 as default
    return 1;
  }

  /**
   * Generate image using FAL
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/${this.models.image}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Key ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: request.prompt,
              image_size: this.getFormatSize(request.format),
              num_inference_steps: this.getQualitySteps(request.quality),
              num_images: request.quantity || 1,
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`FAL API error: ${response.statusText}`);
      }

      const data: FalResult = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        id: Date.now().toString(),
        type: 'image',
        url: data.images?.[0]?.url,
        metadata: {
          provider: 'fal',
          model: this.models.image,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`FAL image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate video using FAL
   */
  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/${this.models.video}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Key ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: request.prompt,
              aspect_ratio: request.aspectRatio || '16:9',
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`FAL API error: ${response.statusText}`);
      }

      const data: FalResult = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        id: Date.now().toString(),
        type: 'video',
        url: data.video?.url,
        metadata: {
          provider: 'fal',
          model: this.models.video,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`FAL video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert image to video using FAL
   */
  async imageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent> {
    try {
      const response = await this.withRetry(async () => {
        return await this.fetchWithTimeout(
          `${this.config.baseUrl}/${this.models.imageToVideo}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Key ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: request.imageUrl,
              motion: request.motion || 'medium',
              prompt: request.prompt,
            }),
          }
        );
      });

      if (!response.ok) {
        throw new Error(`FAL API error: ${response.statusText}`);
      }

      const data: FalResult = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        id: Date.now().toString(),
        type: 'video',
        url: data.video?.url,
        metadata: {
          provider: 'fal',
          model: this.models.imageToVideo,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`FAL image-to-video failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * FAL doesn't support text generation
   */
  async generateText(_request: TextGenerationRequest): Promise<GeneratedContent> {
    throw new Error('FAL provider does not support text generation');
  }

  /**
   * FAL doesn't support video-to-video
   */
  async videoToVideo(_request: VideoToVideoRequest): Promise<GeneratedContent> {
    throw new Error('FAL provider does not support video-to-video conversion');
  }

  /**
   * Helper: Get format size
   */
  private getFormatSize(format?: string): string {
    const sizeMap: Record<string, string> = {
      square: 'square_hd',
      landscape: 'landscape_16_9',
      portrait: 'portrait_9_16',
      story: 'portrait_9_16',
      banner: 'landscape_16_9',
    };
    return sizeMap[format || 'square'] || 'square_hd';
  }

  /**
   * Helper: Get quality steps
   */
  private getQualitySteps(quality?: string): number {
    const qualityMap: Record<string, number> = {
      standard: 4,
      high: 6,
      ultra: 8,
    };
    return qualityMap[quality || 'high'] || 6;
  }
}

/**
 * Create a FAL provider
 */
export function createFalProvider(config: FalConfig): FalProvider {
  return new FalProvider(config);
}
