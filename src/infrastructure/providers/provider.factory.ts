
import type {
  ProviderConfig,
  ProviderHealth,
  ProviderType,
  ImageGenerationRequest,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoToVideoRequest,
  GeneratedContent,
} from '../../domain/config/ProviderConfig';
import type {
  ITextGenerator,
  TextGenerationOptions,
} from '../../domain/interfaces/ITextGenerator';
import { ProviderTimingConfig } from '../../domain/limits/ProviderTimingConfig';

export type { ProviderConfig, ProviderHealth, ProviderType };
import { ProviderError as ProviderErrorBase } from './base.provider';
import type { IAIProvider } from './base.provider';

const ProviderUnavailableInfraError = ProviderErrorBase;

interface HealthCheckCache {
  health: ProviderHealth;
  timestamp: number;
}

export class ProviderFactory implements ITextGenerator {
  private providers: Map<string, IAIProvider> = new Map();
  private config: ProviderConfig;
  private healthCache: Map<string, HealthCheckCache> = new Map();
  private healthCheckTTL: number;

  constructor(config: ProviderConfig, healthCheckTTL?: number) {
    this.config = config;
    this.healthCheckTTL = healthCheckTTL || ProviderTimingConfig.HEALTH_CHECK_TTL_MS;
  }

  register(provider: IAIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IAIProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  getProvidersByType(type: ProviderType): IAIProvider[] {
    return this.getAllProviders().filter(
      provider => provider.type === type || provider.type === 'multimodal'
    );
  }

  getProviderForType(type: ProviderType): IAIProvider {
    const providers = this.getProvidersByType(type);

    if (providers.length === 0) {
      throw new ProviderUnavailableInfraError('factory', `No provider available for type: ${type}`);
    }

    for (const providerId of this.config.priority) {
      const provider = providers.find(p => p.id === providerId);
      if (provider && this.isProviderHealthy(provider.id)) {
        return provider;
      }
    }

    for (const provider of providers) {
      if (this.isProviderHealthy(provider.id)) {
        return provider;
      }
    }

    throw new ProviderUnavailableInfraError('factory', `All providers unavailable for type: ${type}`);
  }

  getTextProvider(): IAIProvider {
    return this.getProviderForType('text');
  }

  getImageProvider(): IAIProvider {
    return this.getProviderForType('image');
  }

  getVideoProvider(): IAIProvider {
    return this.getProviderForType('video');
  }

  async checkProviderHealth(providerId: string, forceRefresh = false): Promise<ProviderHealth> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return 'unavailable';
    }

    const cached = this.healthCache.get(providerId);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp) < this.healthCheckTTL) {
      return cached.health;
    }

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

  isProviderHealthy(providerId: string): boolean {
    const cached = this.healthCache.get(providerId);
    if (!cached) {
      return true;
    }
    return cached.health === 'healthy' || cached.health === 'degraded';
  }

  async refreshAllHealth(): Promise<void> {
    const checks = Array.from(this.providers.keys()).map(id =>
      this.checkProviderHealth(id)
    );
    await Promise.all(checks);
  }

  async executeWithFallback<T>(
    requestType: ProviderType,
    fn: (provider: IAIProvider) => Promise<T>
  ): Promise<T> {
    const providers = this.getProvidersByType(requestType);

    if (providers.length === 0) {
      throw new ProviderUnavailableInfraError('factory', `No provider available for type: ${requestType}`);
    }

    for (const providerId of this.config.priority) {
      const provider = providers.find(p => p.id === providerId);
      if (!provider || !this.isProviderHealthy(provider.id)) {
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

    for (const provider of providers) {
      if (this.config.priority.includes(provider.id)) {
        continue;
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

    throw new ProviderUnavailableInfraError('factory', `All providers failed for type: ${requestType}`);
  }

  async generateImage(request: ImageGenerationRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('image', provider => provider.generateImage(request));
  }

  async generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('video', provider => provider.generateVideo(request));
  }

  async imageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('video', provider => provider.imageToVideo(request));
  }

  async videoToVideo(request: VideoToVideoRequest): Promise<GeneratedContent> {
    return this.executeWithFallback('video', provider => provider.videoToVideo(request));
  }

  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    const provider = this.getTextProvider();
    const result = await provider.generateText({
      type: 'text',
      prompt,
      model: options.model,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
    });
    if (typeof result.content === 'string') {
      return result.content;
    }
    throw new Error(`Provider ${provider.id} returned no text content`);
  }

  async *generateTextStream(
    prompt: string,
    options: TextGenerationOptions = {},
  ): AsyncGenerator<string> {
    const text = await this.generateText(prompt, options);
    yield text;
  }
}

export function createProviderFactory(config: ProviderConfig): ProviderFactory {
  return new ProviderFactory(config);
}
