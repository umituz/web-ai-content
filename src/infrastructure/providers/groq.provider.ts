
import { BaseAIProvider, type GeneratedContent } from './base.provider';
import { ProviderTimingConfig } from '../../domain/limits/ProviderTimingConfig';
import { ModelDefaults } from '../../domain/limits/ModelDefaults';
import { estimateGroqGenerationCost } from '../../domain/predicates/ProviderCostEstimator';
import type { GroqConfig, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

type GroqProviderModule = typeof import('@umituz/web-ai-groq-provider');
type GroqContainer = NonNullable<ReturnType<GroqProviderModule['getProvider']>>;
type GroqTextService = GroqContainer['textGeneration'];
type GroqHttpClient = GroqContainer['groqHttpClient'];

let textGenerationService: GroqTextService | null = null;
let groqHttpClient: GroqHttpClient | null = null;

async function initializeGroqServices(config: GroqConfig): Promise<void> {
  if (textGenerationService && groqHttpClient) return;
  try {
    const mod = await import('@umituz/web-ai-groq-provider');
    const container: GroqContainer =
      mod.getProvider() ??
      mod.configureProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeout,
        textModel: config.models?.text,
      });
    textGenerationService = container.textGeneration;
    groqHttpClient = container.groqHttpClient;
  } catch (error) {
    console.warn('@umituz/web-ai-groq-provider not available. Groq text generation will be disabled.', error);
    throw new Error('@umituz/web-ai-groq-provider is required for Groq text generation. Please install it: npm install @umituz/web-ai-groq-provider');
  }
}

function requireTextService(): GroqTextService {
  if (!textGenerationService) {
    throw new Error('Groq text generation service not available. Please install @umituz/web-ai-groq-provider');
  }
  return textGenerationService;
}

export class GroqProvider extends BaseAIProvider {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly type = 'text' as const;

  private defaultModel: string = ModelDefaults.GROQ_TEXT;
  private groqConfig: GroqConfig | null = null;
  private readonly reasoningEffort: 'low' | 'medium' | 'high' | undefined;

  constructor(config: GroqConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
      timeout: config.timeout || ProviderTimingConfig.GROQ_TIMEOUT_MS,
      retryAttempts: config.retryAttempts || ProviderTimingConfig.GROQ_RETRY_ATTEMPTS,
    });
    this.defaultModel = config.models?.text || this.defaultModel;
    this.reasoningEffort = config.reasoningEffort;
    this.groqConfig = config;
  }

  async healthCheck(): Promise<'healthy' | 'degraded' | 'exhausted' | 'unavailable'> {
    try {
      if (!this.config.apiKey) {
        return 'unavailable';
      }

      await initializeGroqServices(this.groqConfig!);

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

  async estimateCost(_request?: TextGenerationRequest | ImageGenerationRequest | VideoGenerationRequest): Promise<number> {
    return estimateGroqGenerationCost(_request);
  }

  async generateText(request: TextGenerationRequest): Promise<GeneratedContent> {
    try {
      await initializeGroqServices(this.groqConfig!);

      const content = await requireTextService().generateCompletion(request.prompt, {
        model: request.model || this.defaultModel,
        generationConfig: {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          topP: request.topP,
          reasoningEffort: this.reasoningEffort,
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

  async generateStructuredJSON<T = Record<string, unknown>>(
    request: TextGenerationRequest & { schema?: Record<string, unknown> }
  ): Promise<T> {
    try {
      await initializeGroqServices(this.groqConfig!);

      return await requireTextService().generateStructured<T>(request.prompt, {
        model: request.model || this.defaultModel,
        generationConfig: {
          temperature: 0.1,
          maxTokens: request.maxTokens || 2048,
          reasoningEffort: this.reasoningEffort,
        },
        schema: request.schema,
      });
    } catch (error) {
      throw new Error(`Groq structured generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async streamText(
    request: TextGenerationRequest,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void
  ): Promise<void> {
    try {
      await initializeGroqServices(this.groqConfig!);

      await requireTextService().streamCompletion(
        request.prompt,
        { onChunk, onComplete },
        {
          model: request.model || this.defaultModel,
          generationConfig: {
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            topP: request.topP,
            reasoningEffort: this.reasoningEffort,
          },
        },
      );
    } catch (error) {
      throw new Error(`Groq streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImage(_request: ImageGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support image generation. Use Pruna provider for image generation.');
  }

  async generateVideo(_request: VideoGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support video generation. Use Pruna provider for video generation.');
  }

  async imageToVideo(_request: ImageToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support image-to-video conversion. Use Pruna provider for image-to-video.');
  }

  async videoToVideo(_request: VideoToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Groq provider does not support video-to-video conversion. Use Pruna provider for video-to-video.');
  }
}

export function createGroqProvider(config: GroqConfig): GroqProvider {
  return new GroqProvider(config);
}
