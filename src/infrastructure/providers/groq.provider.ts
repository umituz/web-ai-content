/**
 * Groq AI Provider
 * Fast LPU inference for text generation using @umituz/web-ai-groq-provider
 */

import { BaseAIProvider, type GeneratedContent } from './base.provider';
import type { GroqConfig, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

// Lazy import from @umituz/web-ai-groq-provider to avoid build issues
// This allows web-ai-content to work without requiring groq-provider as a dependency
let textGenerationService: any = null;
let groqHttpClient: any = null;

async function initializeGroqServices() {
  if (!textGenerationService) {
    try {
      // @ts-ignore - @umituz/web-ai-groq-provider is a peer dependency
      const module = await import('@umituz/web-ai-groq-provider');
      textGenerationService = module.textGenerationService;
      groqHttpClient = module.groqHttpClient;
    } catch (error) {
      console.warn('@umituz/web-ai-groq-provider not available. Groq text generation will be disabled.');
      throw new Error('@umituz/web-ai-groq-provider is required for Groq text generation. Please install it: npm install @umituz/web-ai-groq-provider');
    }
  }
}

/**
 * Groq Provider Implementation
 * Delegates to @umituz/web-ai-groq-provider for actual API calls
 */
export class GroqProvider extends BaseAIProvider {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly type = 'text' as const;

  private defaultModel = 'llama-3.1-8b-instant';
  private groqConfig: GroqConfig | null = null;

  constructor(config: GroqConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
    });
    this.defaultModel = config.models?.text || this.defaultModel;
    this.groqConfig = config;

    // Initialize Groq HTTP client
    if (typeof window !== 'undefined' && config.apiKey) {
      groqHttpClient?.initialize?.(config);
    }
  }

  /**
   * Health check for Groq
   */
  async healthCheck(): Promise<'healthy' | 'degraded' | 'exhausted' | 'unavailable'> {
    try {
      if (!this.config.apiKey) {
        return 'unavailable';
      }

      await initializeGroqServices();

      // Use groqHttpClient if available
      if (groqHttpClient && !groqHttpClient.isInitialized()) {
        groqHttpClient.initialize(this.groqConfig!);
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
  async estimateCost(_request?: TextGenerationRequest | ImageGenerationRequest | VideoGenerationRequest): Promise<number> {
    // Groq offers free tier, so cost is 0
    return 0;
  }

  /**
   * Generate text using Groq API via @umituz/web-ai-groq-provider
   */
  async generateText(request: TextGenerationRequest): Promise<GeneratedContent> {
    await initializeGroqServices();

    if (!textGenerationService) {
      throw new Error('Groq text generation service not available. Please install @umituz/web-ai-groq-provider');
    }

    // Initialize HTTP client if needed
    if (groqHttpClient && !groqHttpClient.isInitialized()) {
      groqHttpClient.initialize(this.groqConfig!);
    }

    try {
      // Use textGenerationService from @umituz/web-ai-groq-provider
      const content = await textGenerationService.generateCompletion(request.prompt, {
        model: request.model || this.defaultModel,
        generationConfig: {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          topP: request.topP,
        },
      });

      return {
        id: `groq-${Date.now()}`,
        type: 'text',
        content,
        metadata: {
          provider: 'groq',
          model: request.model || this.defaultModel,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Groq text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate structured JSON output using Groq
   */
  async generateStructuredJSON<T = Record<string, unknown>>(
    request: TextGenerationRequest & { schema?: Record<string, unknown> }
  ): Promise<T> {
    await initializeGroqServices();

    if (!textGenerationService) {
      throw new Error('Groq text generation service not available. Please install @umituz/web-ai-groq-provider');
    }

    // Initialize HTTP client if needed
    if (groqHttpClient && !groqHttpClient.isInitialized()) {
      groqHttpClient.initialize(this.groqConfig!);
    }

    try {
      // @ts-ignore - dynamic import
      const result = await textGenerationService.generateStructured<T>(request.prompt, {
        model: request.model || this.defaultModel,
        generationConfig: {
          temperature: 0.1, // Lower temperature for JSON
          maxTokens: request.maxTokens || 2048,
        },
        schema: request.schema,
      });

      return result;
    } catch (error) {
      throw new Error(`Groq structured generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream text generation using Groq
   */
  async streamText(
    request: TextGenerationRequest,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void
  ): Promise<void> {
    await initializeGroqServices();

    if (!textGenerationService) {
      throw new Error('Groq text generation service not available. Please install @umituz/web-ai-groq-provider');
    }

    // Initialize HTTP client if needed
    if (groqHttpClient && !groqHttpClient.isInitialized()) {
      groqHttpClient.initialize(this.groqConfig!);
    }

    try {
      await textGenerationService.streamCompletion(
        request.prompt,
        {
          onChunk,
          onComplete,
        },
        {
          model: request.model || this.defaultModel,
          generationConfig: {
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            topP: request.topP,
          },
        }
      );
    } catch (error) {
      throw new Error(`Groq streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Groq doesn't support image generation
   */
  async generateImage(_request: ImageGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support image generation. Use Pruna provider for image generation.');
  }

  /**
   * Groq doesn't support video generation
   */
  async generateVideo(_request: VideoGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support video generation. Use Pruna provider for video generation.');
  }

  /**
   * Groq doesn't support image-to-video
   */
  async imageToVideo(_request: ImageToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support image-to-video conversion. Use Pruna provider for image-to-video.');
  }

  /**
   * Groq doesn't support video-to-video
   */
  async videoToVideo(_request: VideoToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support video-to-video conversion. Use Pruna provider for video-to-video.');
  }
}

/**
 * Create a Groq provider
 */
export function createGroqProvider(config: GroqConfig): GroqProvider {
  return new GroqProvider(config);
}
