/**
 * Image Generation Wizard
 * Step-by-step wizard for AI image generation
 */

import { WizardFlow, type WizardStep } from './base.wizard';
import type { ImageGenerationRequest } from '../../domain/config/ProviderConfig';

/**
 * Image wizard steps
 */
export type ImageWizardStep =
  | 'input-prompt'
  | 'select-style'
  | 'configure'
  | 'advanced'
  | 'preview'
  | 'generating'
  | 'results';

/**
 * Image wizard data
 */
export interface ImageWizardData {
  // Input prompt step
  prompt?: string;

  // Select style step
  style?: 'realistic' | 'cartoon' | 'abstract' | 'minimalist' | 'vintage';

  // Configure step
  format?: 'square' | 'landscape' | 'portrait' | 'story' | 'banner';
  quality?: 'standard' | 'high' | 'ultra';
  quantity?: number;

  // Advanced step
  colorPalette?: string[];
  platform?: 'instagram' | 'youtube' | 'facebook' | 'twitter' | 'general';

  // Results step
  generatedImageUrl?: string;
  generatedId?: string;
}

/**
 * Image Wizard Flow
 */
export class ImageWizard extends WizardFlow<ImageWizardStep> {
  constructor() {
    const steps = [
      {
        id: 'input-prompt',
        label: 'Describe Image',
        icon: 'Image',
        description: 'Describe the image you want to create',
        validate: (data: ImageWizardData) => !!data.prompt && data.prompt.length > 0,
      },
      {
        id: 'select-style',
        label: 'Style',
        icon: 'Palette',
        description: 'Choose the artistic style',
        validate: (data: ImageWizardData) => !!data.style,
      },
      {
        id: 'configure',
        label: 'Configure',
        icon: 'Settings',
        description: 'Set format, quality, and quantity',
        validate: (data: ImageWizardData) => !!data.format && !!data.quality,
      },
      {
        id: 'advanced',
        label: 'Advanced',
        icon: 'Sliders',
        description: 'Color palette and platform optimization',
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
        description: 'AI is creating your image',
      },
      {
        id: 'results',
        label: 'Results',
        icon: 'Image',
        description: 'Your generated image is ready',
      },
    ] as WizardStep<ImageWizardStep>[];

    super({
      steps,
      initialStep: 'input-prompt',
      data: {},
    });
  }

  /**
   * Get typed wizard data
   */
  getImageData(): ImageWizardData {
    return this.getData() as ImageWizardData;
  }

  /**
   * Update image wizard data
   */
  updateImageData(updates: Partial<ImageWizardData>): void {
    this.updateData(updates);
  }

  /**
   * Build image generation request
   */
  buildRequest(): ImageGenerationRequest {
    const data = this.getImageData();

    return {
      type: 'image',
      prompt: data.prompt || '',
      style: data.style,
      format: data.format,
      quality: data.quality,
      quantity: data.quantity || 1,
    };
  }

  /**
   * Set generated image
   */
  setGeneratedResult(url: string, id: string): void {
    this.updateImageData({
      generatedImageUrl: url,
      generatedId: id,
    });
  }
}

/**
 * Create an image wizard
 */
export function createImageWizard(): ImageWizard {
  return new ImageWizard();
}
