/**
 * Content Generation Wizard
 * Step-by-step wizard for AI content generation
 */

import { WizardFlow, type WizardConfig, type WizardStep } from './base.wizard';
import type { BlogGenerationRequest, SocialContentRequest, VideoScriptRequest } from '../../domain/entities/ContentGeneration';

/**
 * Content type options
 */
export type ContentType = 'blog' | 'social' | 'script' | 'news' | 'ebook' | 'podcast';

/**
 * Content wizard steps
 */
export type ContentWizardStep =
  | 'select-type'
  | 'input-topic'
  | 'configure'
  | 'advanced'
  | 'preview'
  | 'generating'
  | 'results';

/**
 * Content wizard data
 */
export interface ContentWizardData {
  // Select type step
  contentType?: ContentType;

  // Input topic step
  topic?: string;
  description?: string;

  // Configure step
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'humorous' | 'dramatic' | 'educational';
  platform?: 'twitter' | 'linkedin' | 'instagram' | 'threads' | 'tiktok' | 'facebook';
  targetAudience?: string;
  wordCount?: number;
  duration?: number;

  // Advanced step
  keywords?: string[];
  includeImages?: boolean;
  includeCallToAction?: boolean;
  seoOptimization?: boolean;
  language?: string;

  // Results step
  generatedContent?: string;
  generatedId?: string;
}

/**
 * Content Wizard Flow
 */
export class ContentWizard extends WizardFlow<ContentWizardStep> {
  constructor() {
    const steps = [
      {
        id: 'select-type',
        label: 'Select Type',
        icon: 'Layers',
        description: 'Choose the type of content you want to generate',
        validate: (data: ContentWizardData) => !!data.contentType,
      },
      {
        id: 'input-topic',
        label: 'Topic',
        icon: 'Lightbulb',
        description: 'Enter your topic or idea',
        validate: (data: ContentWizardData) => !!data.topic && data.topic.length > 0,
      },
      {
        id: 'configure',
        label: 'Configure',
        icon: 'Settings',
        description: 'Set tone, audience, and platform',
        validate: (data: ContentWizardData) => !!data.tone && !!data.targetAudience,
      },
      {
        id: 'advanced',
        label: 'Advanced',
        icon: 'Sliders',
        description: 'Additional options and optimizations',
        optional: true,
      },
      {
        id: 'preview',
        label: 'Preview',
        icon: 'Eye',
        description: 'Review your settings before generation',
      },
      {
        id: 'generating',
        label: 'Generating',
        icon: 'Sparkles',
        description: 'AI is generating your content',
      },
      {
        id: 'results',
        label: 'Results',
        icon: 'CheckCircle',
        description: 'Your generated content is ready',
      },
    ] as WizardStep<ContentWizardStep>[];

    super({
      steps,
      initialStep: 'select-type',
      data: {},
    });
  }

  /**
   * Get typed wizard data
   */
  getContentData(): ContentWizardData {
    return this.getData() as ContentWizardData;
  }

  /**
   * Update content wizard data
   */
  updateContentData(updates: Partial<ContentWizardData>): void {
    this.updateData(updates);
  }

  /**
   * Build generation request based on content type
   */
  buildRequest(): BlogGenerationRequest | SocialContentRequest | VideoScriptRequest {
    const data = this.getContentData();

    switch (data.contentType) {
      case 'blog':
        return {
          topic: data.topic || '',
          blogType: 'tutorial',
          targetKeywords: data.keywords || [],
          tone: data.tone || 'professional',
          wordCount: data.wordCount || 1000,
          targetAudience: data.targetAudience || '',
          seoOptimization: data.seoOptimization || false,
          includeImages: data.includeImages || false,
          includeSchema: false,
        };

      case 'social':
        return {
          topic: data.topic || '',
          platform: data.platform || 'twitter',
          tone: data.tone || 'casual',
          hashtags: true,
          maxLength: undefined,
          targetAudience: data.targetAudience,
          includeCallToAction: data.includeCallToAction,
        };

      case 'script':
        return {
          topic: data.topic || '',
          tone: data.tone || 'professional',
          duration: data.duration || 60,
          targetAudience: data.targetAudience || '',
          includeVisuals: true,
          includeCallToAction: data.includeCallToAction || false,
        };

      default:
        throw new Error(`Unsupported content type: ${data.contentType}`);
    }
  }

  /**
   * Set generated content
   */
  setGeneratedResult(content: string, id: string): void {
    this.updateContentData({
      generatedContent: content,
      generatedId: id,
    });
  }
}

/**
 * Create a content wizard
 */
export function createContentWizard(): ContentWizard {
  return new ContentWizard();
}
