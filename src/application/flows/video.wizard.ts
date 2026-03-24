/**
 * Video Generation Wizard
 * Step-by-step wizard for AI video generation
 */

import { WizardFlow, type WizardStep } from './base.wizard';
import type { VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest } from '../../domain/config/ProviderConfig';

/**
 * Video generation type
 */
export type VideoGenerationType = 'text-to-video' | 'image-to-video' | 'video-to-video';

/**
 * Video wizard steps
 */
export type VideoWizardStep =
  | 'select-type'
  | 'input-source'
  | 'configure'
  | 'advanced'
  | 'preview'
  | 'generating'
  | 'results';

/**
 * Video wizard data
 */
export interface VideoWizardData {
  // Select type step
  generationType?: VideoGenerationType;

  // Input source step
  prompt?: string;
  imageUrl?: string;
  sourceVideoUrl?: string;

  // Configure step
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: 'realistic' | 'animated' | 'cinematic' | 'documentary';
  quality?: 'standard' | 'high' | 'ultra';

  // Advanced step
  motion?: 'slow' | 'medium' | 'fast';
  camera?: 'static' | 'pan' | 'zoom' | 'tracking';
  styleTransfer?: 'cinematic' | 'anime' | 'cartoon' | 'vintage';
  enhanceQuality?: boolean;

  // Results step
  generatedVideoUrl?: string;
  generatedId?: string;
}

/**
 * Video Wizard Flow
 */
export class VideoWizard extends WizardFlow<VideoWizardStep> {
  constructor() {
    const steps = [
      {
        id: 'select-type',
        label: 'Select Type',
        icon: 'Video',
        description: 'Choose video generation type',
        validate: (data: VideoWizardData) => !!data.generationType,
      },
      {
        id: 'input-source',
        label: 'Source',
        icon: 'FileInput',
        description: 'Provide your source (prompt, image, or video)',
        validate: (data: VideoWizardData) => {
          if (data.generationType === 'text-to-video') {
            return !!data.prompt && data.prompt.length > 0;
          } else if (data.generationType === 'image-to-video') {
            return !!data.imageUrl;
          } else if (data.generationType === 'video-to-video') {
            return !!data.sourceVideoUrl && !!data.prompt;
          }
          return false;
        },
      },
      {
        id: 'configure',
        label: 'Configure',
        icon: 'Settings',
        description: 'Set duration, aspect ratio, and style',
        validate: (data: VideoWizardData) => !!data.duration && !!data.aspectRatio,
      },
      {
        id: 'advanced',
        label: 'Advanced',
        icon: 'Sliders',
        description: 'Additional video options',
        optional: true,
      },
      {
        id: 'preview',
        label: 'Preview',
        icon: 'Eye',
        description: 'Review your settings',
      },
      {
        id: 'generating',
        label: 'Generating',
        icon: 'Sparkles',
        description: 'AI is creating your video',
      },
      {
        id: 'results',
        label: 'Results',
        icon: 'Video',
        description: 'Your generated video is ready',
      },
    ] as WizardStep<VideoWizardStep>[];

    super({
      steps,
      initialStep: 'select-type',
      data: {},
    });
  }

  /**
   * Get typed wizard data
   */
  getVideoData(): VideoWizardData {
    return this.getData() as VideoWizardData;
  }

  /**
   * Update video wizard data
   */
  updateVideoData(updates: Partial<VideoWizardData>): void {
    this.updateData(updates);
  }

  /**
   * Build video generation request
   */
  buildRequest(): VideoGenerationRequest | ImageToVideoRequest | VideoToVideoRequest {
    const data = this.getVideoData();

    switch (data.generationType) {
      case 'text-to-video':
        return {
          type: 'video',
          prompt: data.prompt || '',
          duration: data.duration || 5,
          aspectRatio: data.aspectRatio || '16:9',
          style: data.style,
          quality: data.quality,
        } as VideoGenerationRequest;

      case 'image-to-video':
        return {
          type: 'video',
          imageUrl: data.imageUrl || '',
          prompt: data.prompt,
          duration: data.duration || 5,
          motion: data.motion || 'medium',
          camera: data.camera || 'static',
        } as ImageToVideoRequest;

      case 'video-to-video':
        return {
          type: 'video',
          sourceVideoUrl: data.sourceVideoUrl || '',
          prompt: data.prompt || '',
          styleTransfer: data.styleTransfer,
          enhanceQuality: data.enhanceQuality,
        } as VideoToVideoRequest;

      default:
        throw new Error(`Unsupported generation type: ${data.generationType}`);
    }
  }

  /**
   * Set generated video
   */
  setGeneratedResult(url: string, id: string): void {
    this.updateVideoData({
      generatedVideoUrl: url,
      generatedId: id,
    });
  }
}

/**
 * Create a video wizard
 */
export function createVideoWizard(): VideoWizard {
  return new VideoWizard();
}
