/**
 * Pruna AI Provider
 * Image and video generation using Pruna AI
 *
 * Real implementation using @umituz/pruna-provider client
 */

import type { PrunaConfig } from '../../domain/config/ProviderConfig';
export { generateWithPruna } from './pruna-generate';

/**
 * Legacy PrunaProvider stub for backward compatibility with AIContentService
 *
 * @deprecated Use generateWithPruna function instead
 */
export class PrunaProvider {
  readonly id = 'pruna';
  readonly name = 'Pruna AI';
  readonly type = 'multimodal' as const;

  constructor(private config: PrunaConfig) {}

  async healthCheck(): Promise<'healthy' | 'degraded' | 'exhausted' | 'unavailable'> {
    return 'healthy';
  }

  async estimateCost(): Promise<number> {
    return 1;
  }

  async generateImage(): Promise<any> {
    throw new Error('Use generateWithPruna function instead');
  }

  async generateVideo(): Promise<any> {
    throw new Error('Use generateWithPruna function instead');
  }

  async generateText(): Promise<any> {
    throw new Error('Pruna does not support text generation');
  }

  async imageToVideo(): Promise<any> {
    throw new Error('Use generateWithPruna function instead');
  }

  async videoToVideo(): Promise<any> {
    throw new Error('Pruna does not support video-to-video');
  }
}

/**
 * Create a Pruna provider factory function
 *
 * @deprecated Use generateWithPruna function instead
 */
export function createPrunaProvider(config: PrunaConfig) {
  return new PrunaProvider(config);
}
