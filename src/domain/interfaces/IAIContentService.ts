import { SocialPlatform, ContentTone, Emotion } from '../types';
import {
  BlogGenerationRequest,
  GeneratedBlog,
  SocialContentRequest,
  GeneratedSocialContent,
  VideoScriptRequest,
  GeneratedVideoScript,
  ContentCalendarEntry,
} from '../entities/ContentGeneration';
import {
  ContentAnalysisRequest,
  ContentAnalysisResult,
  SentimentAnalysisResult,
} from '../entities/SentimentAnalysis';
import {
  SEOOptimizationRequest,
  SEOOptimizationResult,
  SEOScoreBreakdown,
  KeywordAnalysis,
} from '../entities/SEO';
import {
  ABTestRequest,
  ABTestPrediction,
  ABTestComparison,
} from '../entities/ABTesting';

/**
 * AI Content Service Interface
 * Defines all AI-powered content generation capabilities
 */
export interface IAIContentService {
  // Content Generation
  generateBlogPost(request: BlogGenerationRequest): Promise<GeneratedBlog>;
  generateSocialContent(request: SocialContentRequest): Promise<GeneratedSocialContent>;
  generateVideoScript(request: VideoScriptRequest): Promise<GeneratedVideoScript>;

  // Multi-platform
  generateForAllPlatforms(topic: string, tone: ContentTone): Promise<GeneratedSocialContent[]>;

  // Content Calendar
  generateContentCalendar(niche: string, days: number): Promise<ContentCalendarEntry[]>;

  // Sentiment Analysis
  analyzeSentiment(content: string): Promise<SentimentAnalysisResult>;
  analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult>;

  // SEO
  optimizeSEO(request: SEOOptimizationRequest): Promise<SEOOptimizationResult>;
  calculateSEOScore(content: string, keywords: string[]): Promise<SEOScoreBreakdown>;
  analyzeKeywords(content: string, keywords: string[]): Promise<KeywordAnalysis[]>;

  // A/B Testing
  predictABTest(request: ABTestRequest): Promise<ABTestPrediction[]>;
  compareVariants(variantA: string, variantB: string): Promise<ABTestComparison>;

  // Hashtags
  generateHashtags(content: string, count: number): Promise<string[]>;
  optimizeHashtags(hashtags: string[], platform: SocialPlatform): Promise<string[]>;

  // Image Prompts
  generateImagePrompt(description: string, style: string): Promise<string>;
  generateImagePromptsForBlog(blogContent: string): Promise<string[]>;

  // Voice Content
  generateVoiceScript(
    topic: string,
    emotion: Emotion,
    duration: number
  ): Promise<GeneratedVideoScript>;
}

export interface IAIProvider {
  generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;
  generateTextStream(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string>;
}

export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  model?: string;
}
