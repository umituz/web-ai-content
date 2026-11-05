
import type {
  ProviderHealth,
  ProviderType,
  TextGenerationRequest,
  ImageGenerationRequest,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoToVideoRequest,
  GeneratedContent,
} from '../../domain/config/ProviderConfig';
import { ProviderTimingConfig } from '../../domain/limits/ProviderTimingConfig';
import { calculateRetryBackoffDelayMs } from '../../domain/calculations/RetryBackoffDelay';
import { AIError } from '../../domain/errors/AIErrors';

export type { ProviderHealth, ProviderType, GeneratedContent };

export interface IAIProvider {
  readonly id: string;

  readonly name: string;

  readonly type: ProviderType;

  healthCheck(): Promise<ProviderHealth>;

  estimateCost(request: TextGenerationRequest | ImageGenerationRequest | VideoGenerationRequest): Promise<number>;

  generateText(request: TextGenerationRequest): Promise<GeneratedContent>;

  generateImage(request: ImageGenerationRequest): Promise<GeneratedContent>;

  generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent>;

  imageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent>;

  videoToVideo(request: VideoToVideoRequest): Promise<GeneratedContent>;
}

export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: ProviderType;

  protected config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retryAttempts?: number;
  };

  constructor(config: { apiKey: string; baseUrl?: string; timeout?: number; retryAttempts?: number }) {
    this.config = config;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      if (!this.config.apiKey) {
        return 'unavailable';
      }
      return 'healthy';
    } catch {
      return 'unavailable';
    }
  }

  async estimateCost(_request: TextGenerationRequest | ImageGenerationRequest | VideoGenerationRequest): Promise<number> {
    return 0;
  }

  abstract generateText(request: TextGenerationRequest): Promise<GeneratedContent>;
  abstract generateImage(request: ImageGenerationRequest): Promise<GeneratedContent>;
  abstract generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent>;
  abstract imageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent>;
  abstract videoToVideo(request: VideoToVideoRequest): Promise<GeneratedContent>;

  protected async fetchWithTimeout(url: string, options: RequestInit, timeout?: number): Promise<Response> {
    const effectiveTimeout = timeout ?? this.config.timeout ?? ProviderTimingConfig.DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts?: number
  ): Promise<T> {
    const attempts = maxAttempts ?? this.config.retryAttempts ?? ProviderTimingConfig.DEFAULT_RETRY_ATTEMPTS;
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, calculateRetryBackoffDelayMs(i)));
        }
      }
    }

    throw lastError || new Error('Retry attempts exhausted');
  }
}

export class ProviderError extends AIError {
  constructor(
    message: string,
    public readonly providerId: string,
    originalError?: unknown
  ) {
    super(message, 'PROVIDER_ERROR', originalError);
    this.name = 'ProviderError';
  }
}

