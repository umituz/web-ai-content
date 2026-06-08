/**
 * Groq AI Provider
 * Fast LPU inference for text generation using @umituz/web-ai-groq-provider
 */

import { BaseAIProvider, type GeneratedContent } from './base.provider';
import { ProviderTimingConfig } from '../../domain/limits/ProviderTimingConfig';
import { ModelDefaults } from '../../domain/limits/ModelDefaults';
import { estimateGroqGenerationCost } from '../../domain/predicates/ProviderCostEstimator';
import type { GroqConfig, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

interface GroqTextService {
  generateCompletion: (prompt: string, options: GroqGenerationOptions) => Promise<string>;
  generateStructured: <T = Record<string, unknown>>(
    prompt: string,
    options: GroqGenerationOptions,
  ) => Promise<T>;
  streamCompletion: (
    prompt: string,
    callbacks: { onChunk: (chunk: string) => void; onComplete: (full: string) => void },
    options: GroqGenerationOptions,
  ) => Promise<void>;
}

interface GroqHttpClient {
  initialize?: (config: GroqConfig) => void;
  isInitialized?: () => boolean;
}

interface GroqGenerationOptions {
  model?: string;
  generationConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  schema?: Record<string, unknown>;
}

interface GroqModule {
  textGenerationService: GroqTextService;
  groqHttpClient: GroqHttpClient;
}

let textGenerationService: GroqTextService | null = null;
let groqHttpClient: GroqHttpClient | null = null;

async function initializeGroqServices(): Promise<void> {
  if (textGenerationService && groqHttpClient) return;
  try {
    const module = (await import('@umituz/web-ai-groq-provider')) as unknown as GroqModule;
    textGenerationService = module.textGenerationService;
    groqHttpClient = module.groqHttpClient;
  } catch {
    console.warn('@umituz/web-ai-groq-provider not available. Groq text generation will be disabled.');
    throw new Error('@umituz/web-ai-groq-provider is required for Groq text generation. Please install it: npm install @umituz/web-ai-groq-provider');
  }
}

function ensureHttpClient(config: GroqConfig): void {
  if (groqHttpClient && !groqHttpClient.isInitialized?.()) {
    groqHttpClient.initialize?.(config);
  }
}

function requireTextService(): GroqTextService {
  if (!textGenerationService) {
    throw new Error('Groq text generation service not available. Please install @umituz/web-ai-groq-provider');
  }
  return textGenerationService;
}

/**
 * Groq Provider Implementation
 * Delegates to @umituz/web-ai-groq-provider for actual API calls
 */
export class GroqProvider extends BaseAIProvider {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly type = 'text' as const;

  private defaultModel: string = ModelDefaults.GROQ_TEXT;
  private groqConfig: GroqConfig | null = null;

  constructor(config: GroqConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
      timeout: config.timeout || ProviderTimingConfig.GROQ_TIMEOUT_MS,
      retryAttempts: config.retryAttempts || ProviderTimingConfig.GROQ_RETRY_ATTEMPTS,
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
      ensureHttpClient(this.groqConfig!);

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
    return estimateGroqGenerationCost(_request);
  }

  /**
   * Generate text using Groq API via @umituz/web-ai-groq-provider
   */
  async generateText(request: TextGenerationRequest): Promise<GeneratedContent> {
    try {
      await initializeGroqServices();
      ensureHttpClient(this.groqConfig!);

      const content = await requireTextService().generateCompletion(request.prompt, {
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
    try {
      await initializeGroqServices();
      ensureHttpClient(this.groqConfig!);

      return await requireTextService().generateStructured<T>(request.prompt, {
        model: request.model || this.defaultModel,
        generationConfig: {
          temperature: 0.1, // Lower temperature for JSON
          maxTokens: request.maxTokens || 2048,
        },
        schema: request.schema,
      });
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
    try {
      await initializeGroqServices();
      ensureHttpClient(this.groqConfig!);

      await requireTextService().streamCompletion(
        request.prompt,
        { onChunk, onComplete },
        {
          model: request.model || this.defaultModel,
          generationConfig: {
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            topP: request.topP,
          },
        },
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
