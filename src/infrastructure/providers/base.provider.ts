/**
 * Base AI Provider Interface
 * Defines the contract all AI providers must implement
 */

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

// Re-export commonly used types
export type { ProviderHealth, ProviderType, GeneratedContent };

/**
 * AI Provider Interface
 * All AI providers must implement this interface
 */
export interface IAIProvider {
  /**
   * Unique provider identifier
   */
  readonly id: string;

  /**
   * Human-readable provider name
   */
  readonly name: string;

  /**
   * Provider type(s)
   */
  readonly type: ProviderType;

  /**
   * Check if provider is healthy and available
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Estimate cost for a generation request
   */
  estimateCost(request: TextGenerationRequest | ImageGenerationRequest | VideoGenerationRequest): Promise<number>;

  /**
   * Generate text content
   */
  generateText(request: TextGenerationRequest): Promise<GeneratedContent>;

  /**
   * Generate image from text prompt
   */
  generateImage(request: ImageGenerationRequest): Promise<GeneratedContent>;

  /**
   * Generate video from text prompt
   */
  generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent>;

  /**
   * Convert image to video
   */
  imageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent>;

  /**
   * Transform video (video-to-video)
   */
  videoToVideo(request: VideoToVideoRequest): Promise<GeneratedContent>;
}

/**
 * Abstract base provider with common functionality
 */
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

  /**
   * Default health check implementation
   * Override for provider-specific health checks
   */
  async healthCheck(): Promise<ProviderHealth> {
    try {
      // Default: check if API key is present
      if (!this.config.apiKey) {
        return 'unavailable';
      }
      return 'healthy';
    } catch {
      return 'unavailable';
    }
  }

  /**
   * Default cost estimation
   * Override for provider-specific pricing
   */
  async estimateCost(request: TextGenerationRequest | ImageGenerationRequest | VideoGenerationRequest): Promise<number> {
    // Default: return 0 (free)
    return 0;
  }

  /**
   * Abstract methods - must be implemented by concrete providers
   */
  abstract generateText(request: TextGenerationRequest): Promise<GeneratedContent>;
  abstract generateImage(request: ImageGenerationRequest): Promise<GeneratedContent>;
  abstract generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent>;
  abstract imageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent>;
  abstract videoToVideo(request: VideoToVideoRequest): Promise<GeneratedContent>;

  /**
   * Helper method for HTTP requests with timeout
   */
  protected async fetchWithTimeout(url: string, options: RequestInit, timeout?: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || this.config.timeout || 30000);

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

  /**
   * Helper method for retries
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts?: number
  ): Promise<T> {
    const attempts = maxAttempts || this.config.retryAttempts || 3;
    let lastError: Error | undefined;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < attempts - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Retry attempts exhausted');
  }
}

/**
 * Provider error class
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Provider not available error
 */
export class ProviderUnavailableError extends ProviderError {
  constructor(providerId: string) {
    super(`Provider ${providerId} is not available`, providerId);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Provider quota exhausted error
 */
export class ProviderQuotaExhaustedError extends ProviderError {
  constructor(providerId: string) {
    super(`Provider ${providerId} quota exhausted`, providerId);
    this.name = 'ProviderQuotaExhaustedError';
  }
}
