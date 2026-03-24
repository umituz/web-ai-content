/**
 * Provider Factory
 * Manages AI provider registration, selection, and fallback logic
 */

import type {
  ProviderConfig,
  ProviderHealth,
  ProviderType,
  TextGenerationRequest,
  ImageGenerationRequest,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoToVideoRequest,
  GeneratedContent,
} from '../../domain/config/ProviderConfig';

// Re-export types for convenience
export type { ProviderConfig, ProviderHealth, ProviderType };
import { ProviderUnavailableError } from './base.provider';
import type { IAIProvider } from './base.provider';

/**
 * Health check cache entry with TTL
 */
interface HealthCheckCache {
  health: ProviderHealth;
  timestamp: number;
}

/**
 * Default health check TTL (5 minutes)
 */
const DEFAULT_HEALTH_CHECK_TTL = 5 * 60 * 1000;

/**
 * Provider Factory
 * Manages multiple AI providers with automatic fallback
 */
export class ProviderFactory {
  private providers: Map<string, IAIProvider> = new Map();
  private config: ProviderConfig;
  private healthCache: Map<string, HealthCheckCache> = new Map();
  private healthCheckTTL: number;

  constructor(config: ProviderConfig, healthCheckTTL?: number) {
    this.config = config;
    this.healthCheckTTL = healthCheckTTL || DEFAULT_HEALTH_CHECK_TTL;
  }

  /**
   * Register a provider
   */
  register(provider: IAIProvider): void {
    this.providers.set(provider.id, provider);
    // Initialize with healthy status but no cache entry
    // This will force first health check
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): IAIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by type
   */
  getProvidersByType(type: ProviderType): IAIProvider[] {
    return this.getAllProviders().filter(
      provider => provider.type === type || provider.type === 'multimodal'
    );
  }

  /**
   * Get the best available provider for a given type
   * Follows priority order with automatic fallback
   */
  getProviderForType(type: ProviderType): IAIProvider {
    const providers = this.getProvidersByType(type);

    if (providers.length === 0) {
      throw new ProviderUnavailableError(`No provider available for type: ${type}`);
    }

    // Try providers in priority order
    for (const providerId of this.config.priority) {
      const provider = providers.find(p => p.id === providerId);
      if (provider && this.isProviderHealthy(provider.id)) {
        return provider;
      }
    }

    // Fallback to first healthy provider
    for (const provider of providers) {
      if (this.isProviderHealthy(provider.id)) {
        return provider;
      }
    }

    // All providers exhausted/unavailable
    throw new ProviderUnavailableError(`All providers unavailable for type: ${type}`);
  }

  /**
   * Get text provider
   */
  getTextProvider(): IAIProvider {
    return this.getProviderForType('text');
  }

  /**
   * Get image provider
   */
  getImageProvider(): IAIProvider {
    return this.getProviderForType('image');
  }

  /**
   * Get video provider
   */
  getVideoProvider(): IAIProvider {
    return this.getProviderForType('video');
  }

  /**
   * Check if a provider is healthy
   */
  async checkProviderHealth(providerId: string, forceRefresh = false): Promise<ProviderHealth> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return 'unavailable';
    }

    // Check cache first
    const cached = this.healthCache.get(providerId);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp) < this.healthCheckTTL) {
      return cached.health;
    }

    // Perform actual health check
    try {
      const health = await provider.healthCheck();
      this.healthCache.set(providerId, { health, timestamp: now });
      return health;
    } catch {
      const health: ProviderHealth = 'unavailable';
      this.healthCache.set(providerId, { health, timestamp: now });
      return health;
    }
  }

  /**
   * Get health status of a provider (cached)
   */
  isProviderHealthy(providerId: string): boolean {
    const cached = this.healthCache.get(providerId);
    if (!cached) {
      // No cache yet, assume healthy for first attempt
      return true;
    }
    return cached.health === 'healthy' || cached.health === 'degraded';
  }

  /**
   * Refresh health status of all providers
   */
  async refreshAllHealth(): Promise<void> {
    const checks = Array.from(this.providers.keys()).map(id =>
      this.checkProviderHealth(id)
    );
    await Promise.all(checks);
  }

  /**
   * Execute a request with automatic fallback
   */
  async executeWithFallback<T>(
    requestType: ProviderType,
    fn: (provider: IAIProvider) => Promise<T>
  ): Promise<T> {
    const providers = this.getProvidersByType(requestType);

    if (providers.length === 0) {
      throw new ProviderUnavailableError(`No provider available for type: ${requestType}`);
    }

    // Try in priority order
    for (const providerId of this.config.priority) {
      const provider = providers.find(p => p.id === providerId);
      if (!provider || !this.isProviderHealthy(provider.id)) {
        continue;
      }

      try {
        return await fn(provider);
      } catch (error) {
        // Mark as degraded and try next provider
        const cached = this.healthCache.get(provider.id);
        if (cached) {
          this.healthCache.set(provider.id, { health: 'degraded', timestamp: cached.timestamp });
        }

        if (!this.config.fallbackEnabled) {
          throw error;
        }
        // Continue to next provider
      }
    }

    // Try remaining providers not in priority list
    for (const provider of providers) {
      if (this.config.priority.includes(provider.id)) {
        continue; // Already tried
      }

      if (!this.isProviderHealthy(provider.id)) {
        continue;
      }

      try {
        return await fn(provider);
      } catch (error) {
        const cached = this.healthCache.get(provider.id);
        if (cached) {
          this.healthCache.set(provider.id, { health: 'degraded', timestamp: cached.timestamp });
        }
        if (!this.config.fallbackEnabled) {
          throw error;
        }
      }
    }

    throw new ProviderUnavailableError(`All providers failed for type: ${requestType}`);
  }

  /**
   * Generate text with automatic fallback
   */
  async generateText(request: TextGenerationRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('text', provider => provider.generateText(request));
  }

  /**
   * Generate image with automatic fallback
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('image', provider => provider.generateImage(request));
  }

  /**
   * Generate video with automatic fallback
   */
  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('video', provider => provider.generateVideo(request));
  }

  /**
   * Convert image to video with automatic fallback
   */
  async imageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('video', provider => provider.imageToVideo(request));
  }

  /**
   * Transform video with automatic fallback
   */
  async videoToVideo(request: VideoToVideoRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('video', provider => provider.videoToVideo(request));
  }
}

/**
 * Create a provider factory from configuration
 */
export function createProviderFactory(config: ProviderConfig): ProviderFactory {
  return new ProviderFactory(config);
}
