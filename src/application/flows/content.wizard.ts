/**
 * Content Generation Wizard
 * Step-by-step wizard for AI content generation
 */

import type { WizardStep } from './base.wizard';
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
 * Predefined steps for the content wizard.
 * Exported as data so both the imperative flows and the React hook
 * share the exact same step definition.
 */
export const CONTENT_WIZARD_STEPS: ReadonlyArray<WizardStep<ContentWizardStep>> = [
  {
    id: 'select-type',
    label: 'Select Type',
    icon: 'Layers',
    description: 'Choose the type of content you want to generate',
    validate: (data) => Boolean((data as ContentWizardData).contentType),
  },
  {
    id: 'input-topic',
    label: 'Topic',
    icon: 'Lightbulb',
    description: 'Enter your topic or idea',
    validate: (data) => {
      const topic = (data as ContentWizardData).topic;
      return typeof topic === 'string' && topic.length > 0;
    },
  },
  {
    id: 'configure',
    label: 'Configure',
    icon: 'Settings',
    description: 'Set tone, audience, and platform',
    validate: (data) => {
      const d = data as ContentWizardData;
      return Boolean(d.tone && d.targetAudience);
    },
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
];

/**
 * Build a typed generation request from the wizard's collected data.
 * Throws when called before the data-collection steps are complete.
 */
export function buildContentRequest(
  data: ContentWizardData,
): BlogGenerationRequest | SocialContentRequest | VideoScriptRequest {
  switch (data.contentType) {
    case 'blog':
      return {
        topic: data.topic ?? '',
        blogType: 'tutorial',
        targetKeywords: data.keywords ?? [],
        tone: data.tone ?? 'professional',
        wordCount: data.wordCount ?? 1000,
        targetAudience: data.targetAudience ?? '',
        seoOptimization: data.seoOptimization ?? false,
        includeImages: data.includeImages ?? false,
        includeSchema: false,
      };
    case 'social':
      return {
        topic: data.topic ?? '',
        platform: data.platform ?? 'twitter',
        tone: data.tone ?? 'casual',
        hashtags: true,
        targetAudience: data.targetAudience,
        includeCallToAction: data.includeCallToAction,
      };
    case 'script':
      return {
        topic: data.topic ?? '',
        tone: data.tone ?? 'professional',
        duration: data.duration ?? 60,
        targetAudience: data.targetAudience ?? '',
        includeVisuals: true,
        includeCallToAction: data.includeCallToAction ?? false,
      };
    default:
      throw new Error(`Unsupported content type: ${data.contentType}`);
  }
}
