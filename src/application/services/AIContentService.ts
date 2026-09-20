/**
 * AI Content Service (Facade)
 *
 * Thin orchestrator that delegates to focused feature services:
 * - BlogService, SocialService, VideoScriptService, AnalysisService,
 *   SeoService, ABTestService, ImagePromptService, ContentCalendarService,
 *   MediaGenerationService.
 *
 * The facade keeps the public IAIContentService contract intact for existing
 * consumers while the underlying work is split along single-responsibility lines.
 */

import type LlmClient from '@anthropic-ai/sdk';
import type { IAIContentService } from '../../domain/interfaces/IAIContentService';
import type { ITextGenerator, TextGenerationOptions } from '../../domain/interfaces/ITextGenerator';
import { TextModelDefaults } from '../../domain/limits/ModelDefaults';
import type {
  BlogGenerationRequest,
  GeneratedBlog,
  SocialContentRequest,
  GeneratedSocialContent,
  VideoScriptRequest,
  GeneratedVideoScript,
  ContentCalendarEntry,
} from '../../domain/entities/ContentGeneration';
import type {
  ContentAnalysisRequest,
  ContentAnalysisResult,
  SentimentAnalysisResult,
} from '../../domain/entities/SentimentAnalysis';
import type {
  SEOOptimizationRequest,
  SEOOptimizationResult,
  SEOScoreBreakdown,
  KeywordAnalysis,
} from '../../domain/entities/SEO';
import type {
  ABTestRequest,
  ABTestPrediction,
  ABTestComparison,
} from '../../domain/entities/ABTesting';
import type { SocialPlatform, ContentTone, Emotion } from '../../domain/types';
import type { ProviderConfig } from '../../domain/config/ProviderConfig';
import type {
  ImageGenerationRequest,
  VideoGenerationRequest,
  ImageToVideoRequest,
  VideoToVideoRequest,
  GeneratedContent,
} from '../../domain/config/ProviderConfig';
import { ProviderFactory, createProviderFactory } from '../../infrastructure/providers/provider.factory';
import { createGroqProvider } from '../../infrastructure/providers/groq.provider';
import { createFalProvider } from '../../infrastructure/providers/fal.provider';
import { createGeminiProvider } from '../../infrastructure/providers/gemini.provider';
import { createPrunaProvider } from '../../infrastructure/providers/pruna.provider';
import { BlogService } from './BlogService';
import { SocialService } from './SocialService';
import { VideoScriptService } from './VideoScriptService';
import { AnalysisService } from './AnalysisService';
import { SeoService } from './SeoService';
import { ABTestService } from './ABTestService';
import { ImagePromptService } from './ImagePromptService';
import { ContentCalendarService } from './ContentCalendarService';
import { MediaGenerationService } from './ProviderServices';
import { GenerationExecutor } from './GenerationExecutor';

interface LlmTextGeneratorOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  model?: string;
}

/**
 * LLM text generator — the default ITextGenerator strategy for the legacy
 * string-configuration mode (`new AIContentService(apiKey)`).
 *
 * The backing SDK is an *optional* peer dependency and is loaded lazily on
 * first generation, so consumers that use provider-config mode (or inject
 * their own ITextGenerator) never pay for — or even install — that SDK.
 */
class LlmTextGenerator implements ITextGenerator {
  private client: LlmClient | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {}

  private async getClient(): Promise<LlmClient> {
    if (!this.client) {
      const { default: Client } = await import('@anthropic-ai/sdk');
      this.client = new Client({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    const client = await this.getClient();
    const merged: LlmTextGeneratorOptions = {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      model: options.model,
      topP: options.topP,
    };
    const message = await client.messages.create({
      model: merged.model || this.defaultModel,
      max_tokens: merged.maxTokens || TextModelDefaults.MAX_TOKENS,
      temperature: merged.temperature ?? TextModelDefaults.DEFAULT_TEMPERATURE,
      top_p: merged.topP ?? TextModelDefaults.DEFAULT_TOP_P,
      messages: [{ role: 'user', content: prompt }],
    });
    const first = message.content[0];
    if (first?.type === 'text') {
      return first.text;
    }
    throw new Error('Unexpected response type from text model API');
  }

  async *generateTextStream(prompt: string, options: TextGenerationOptions = {}): AsyncGenerator<string> {
    const text = await this.generateText(prompt, options);
    yield text;
  }
}

interface ServiceBundle {
  providerFactory: ProviderFactory;
  blogService: BlogService;
  socialService: SocialService;
  videoScriptService: VideoScriptService;
  analysisService: AnalysisService;
  seoService: SeoService;
  abTestService: ABTestService;
  imagePromptService: ImagePromptService;
  contentCalendarService: ContentCalendarService;
  mediaGenerationService: MediaGenerationService;
}

const buildServices = (
  configOrApiKey: ProviderConfig | string,
  model: string,
  textGenerator?: ITextGenerator,
): ServiceBundle => {
  if (typeof configOrApiKey === 'string') {
    // Text-only mode: an injected generator wins; otherwise the default
    // LLM-backed generator is created lazily from the API key.
    const generator = textGenerator ?? new LlmTextGenerator(configOrApiKey, model);
    const executor = new GenerationExecutor(generator);
    // Text-only mode: factory has no providers, media-generation methods
    // will surface a clear error explaining ProviderConfig is required.
    const emptyFactory = new ProviderFactory({
      priority: [],
      fallbackEnabled: false,
      retryAttempts: 0,
      timeout: 0,
    });
    return {
      providerFactory: emptyFactory,
      blogService: new BlogService(executor),
      socialService: new SocialService(executor),
      videoScriptService: new VideoScriptService(executor),
      analysisService: new AnalysisService(executor),
      seoService: new SeoService(executor),
      abTestService: new ABTestService(executor),
      imagePromptService: new ImagePromptService(executor),
      contentCalendarService: new ContentCalendarService(executor),
      mediaGenerationService: new MediaGenerationService(emptyFactory),
    };
  }

  const factory = createProviderFactory(configOrApiKey);
  if (configOrApiKey.groq?.enabled) {
    factory.register(createGroqProvider(configOrApiKey.groq));
  }
  if (configOrApiKey.fal?.enabled) {
    factory.register(createFalProvider(configOrApiKey.fal));
  }
  if (configOrApiKey.gemini?.enabled) {
    factory.register(createGeminiProvider(configOrApiKey.gemini));
  }
  if (configOrApiKey.pruna?.enabled) {
    factory.register(createPrunaProvider(configOrApiKey.pruna));
  }

  const executor = new GenerationExecutor(factory);
  return {
    providerFactory: factory,
    blogService: new BlogService(executor),
    socialService: new SocialService(executor),
    videoScriptService: new VideoScriptService(executor),
    analysisService: new AnalysisService(executor),
    seoService: new SeoService(executor),
    abTestService: new ABTestService(executor),
    imagePromptService: new ImagePromptService(executor),
    contentCalendarService: new ContentCalendarService(executor),
    mediaGenerationService: new MediaGenerationService(factory),
  };
};

export class AIContentService implements IAIContentService {
  private readonly providerFactory: ProviderFactory;
  private readonly blogService: BlogService;
  private readonly socialService: SocialService;
  private readonly videoScriptService: VideoScriptService;
  private readonly analysisService: AnalysisService;
  private readonly seoService: SeoService;
  private readonly abTestService: ABTestService;
  private readonly imagePromptService: ImagePromptService;
  private readonly contentCalendarService: ContentCalendarService;
  private readonly mediaGenerationService: MediaGenerationService;

  /**
   * @param configOrApiKey Provider configuration (multi-provider mode) or a
   *        bare API key (legacy text-only mode).
   * @param model Default text model for the legacy string mode.
   * @param textGenerator Optional custom text backend for the legacy string
   *        mode. Injecting one decouples the service from the default
   *        LLM-backed generator entirely.
   */
  constructor(
    configOrApiKey: ProviderConfig | string,
    model: string = TextModelDefaults.TEXT_MODEL,
    textGenerator?: ITextGenerator,
  ) {
    const bundle = buildServices(configOrApiKey, model, textGenerator);
    this.providerFactory = bundle.providerFactory;
    this.blogService = bundle.blogService;
    this.socialService = bundle.socialService;
    this.videoScriptService = bundle.videoScriptService;
    this.analysisService = bundle.analysisService;
    this.seoService = bundle.seoService;
    this.abTestService = bundle.abTestService;
    this.imagePromptService = bundle.imagePromptService;
    this.contentCalendarService = bundle.contentCalendarService;
    this.mediaGenerationService = bundle.mediaGenerationService;
  }

  // ---------- Blog ----------
  generateBlogPost(request: BlogGenerationRequest): Promise<GeneratedBlog> {
    return this.blogService.generateBlogPost(request);
  }

  // ---------- Social ----------
  generateSocialContent(request: SocialContentRequest): Promise<GeneratedSocialContent> {
    return this.socialService.generateSocialContent(request);
  }
  generateForAllPlatforms(topic: string, tone: ContentTone): Promise<GeneratedSocialContent[]> {
    return this.socialService.generateForAllPlatforms(topic, tone);
  }
  generateHashtags(content: string, count: number): Promise<string[]> {
    return this.socialService.generateHashtags(content, count);
  }
  optimizeHashtags(hashtags: string[], platform: SocialPlatform): Promise<string[]> {
    return Promise.resolve(this.socialService.optimizeHashtags(hashtags, platform));
  }

  // ---------- Video Script ----------
  generateVideoScript(request: VideoScriptRequest): Promise<GeneratedVideoScript> {
    return this.videoScriptService.generateVideoScript(request);
  }
  generateVoiceScript(topic: string, emotion: Emotion, duration: number): Promise<GeneratedVideoScript> {
    return this.videoScriptService.generateVoiceScript(topic, emotion, duration);
  }

  // ---------- Content Calendar ----------
  generateContentCalendar(niche: string, days: number): Promise<ContentCalendarEntry[]> {
    return this.contentCalendarService.generateContentCalendar(niche, days);
  }

  // ---------- Analysis ----------
  analyzeSentiment(content: string): Promise<SentimentAnalysisResult> {
    return this.analysisService.analyzeSentiment(content);
  }
  analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    return this.analysisService.analyzeContent(request);
  }

  // ---------- SEO ----------
  optimizeSEO(request: SEOOptimizationRequest): Promise<SEOOptimizationResult> {
    return this.seoService.optimizeSEO(request);
  }
  calculateSEOScore(content: string, keywords: string[]): Promise<SEOScoreBreakdown> {
    return this.seoService.calculateSEOScore(content, keywords);
  }
  analyzeKeywords(content: string, keywords: string[]): Promise<KeywordAnalysis[]> {
    return Promise.resolve(this.seoService.analyzeKeywords(content, keywords));
  }

  // ---------- A/B Testing ----------
  predictABTest(request: ABTestRequest): Promise<ABTestPrediction[]> {
    return this.abTestService.predictABTest(request);
  }
  compareVariants(variantA: string, variantB: string): Promise<ABTestComparison> {
    return this.abTestService.compareVariants(variantA, variantB);
  }

  // ---------- Image Prompts ----------
  generateImagePrompt(description: string, style: string): Promise<string> {
    return this.imagePromptService.generateImagePrompt(description, style);
  }
  generateImagePromptsForBlog(blogContent: string): Promise<string[]> {
    return this.imagePromptService.generateImagePromptsForBlog(blogContent);
  }

  // ---------- Provider-backed media ----------
  generateImage(request: ImageGenerationRequest): Promise<GeneratedContent> {
    return this.mediaGenerationService.generateImage(request);
  }
  generateVideo(request: VideoGenerationRequest): Promise<GeneratedContent> {
    return this.mediaGenerationService.generateVideo(request);
  }
  convertImageToVideo(request: ImageToVideoRequest): Promise<GeneratedContent> {
    return this.mediaGenerationService.convertImageToVideo(request);
  }
  transformVideo(request: VideoToVideoRequest): Promise<GeneratedContent> {
    return this.mediaGenerationService.transformVideo(request);
  }
}

// Re-export IAIProvider for backwards compatibility (now lives in infrastructure)
export type { IAIProvider } from '../../infrastructure/providers/base.provider';
