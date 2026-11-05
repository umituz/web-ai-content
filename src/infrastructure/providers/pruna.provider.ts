
import type { PrunaConfig } from '../../domain/config/ProviderConfig';
import type { GeneratedContent } from './base.provider';
import type {
  TextGenerationRequest,
  ImageGenerationRequest,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoToVideoRequest,
} from '../../domain/config/ProviderConfig';
export { generateWithPruna } from './pruna-generate';

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

  async generateImage(_request: ImageGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Use generateWithPruna function instead');
  }

  async generateVideo(_request: VideoGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Use generateWithPruna function instead');
  }

  async generateText(_request: TextGenerationRequest): Promise<GeneratedContent> {
    throw new Error('Pruna does not support text generation');
  }

  async imageToVideo(_request: ImageToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Use generateWithPruna function instead');
  }

  async videoToVideo(_request: VideoToVideoRequest): Promise<GeneratedContent> {
    throw new Error('Pruna does not support video-to-video');
  }
}

export function createPrunaProvider(config: PrunaConfig) {
  return new PrunaProvider(config);
}
