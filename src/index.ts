/**
 * @umituz/web-ai-content
 *
 * AI-powered content generation suite with text, image, video generation,
 * multi-provider support, and wizard flow orchestration.
 *
 * @example
 * ```tsx
 * import { useAIContent } from '@umituz/web-ai-content';
 * import { AI_PROVIDER_CONFIG } from './config/ai.config';
 *
 * function MyComponent() {
 *   const { generateImage, generateVideo, isLoading, error, errorCode } = useAIContent({
 *     providers: AI_PROVIDER_CONFIG,
 *   });
 *
 *   const handleGenerateImage = async () => {
 *     const result = await generateImage({
 *       type: 'image',
 *       prompt: 'A futuristic city with neon lights',
 *       style: 'realistic',
 *       format: 'square',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleGenerateImage} disabled={isLoading}>
 *       {isLoading ? 'Generating...' : 'Generate Image'}
 *     </button>
 *   );
 * }
 * ```
 */

// Domain Layer - Types and Config
export type { SocialPlatform, ContentTone, ContentType, Emotion, Sentiment, BlogType, PlatformSpecs, PLATFORM_SPECS } from './domain/types';
export type { ProviderConfig, ProviderHealth, ProviderType, BaseProviderConfig, GroqConfig, FalConfig, PrunaConfig, GeminiConfig } from './domain/config/ProviderConfig';
export type { GenerationRequest, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest, GeneratedContent } from './domain/config/ProviderConfig';

// Domain Layer - AI Generation Types
export type {
  GenerationType,
  ImageQuality,
  VideoQuality,
  AspectRatio,
  GenerationStatus,
  ImageGenerationInput,
  VideoGenerationInput,
  GenerationResult,
  GenerationMetadata,
  GenerationProgress,
  CreditCost,
} from './domain/types/GenerationTypes';
export { GENERATION_COSTS, calculateCreditCost } from './domain/types/GenerationTypes';

// Domain Layer - AI Generation Constants
export {
  ASPECT_RATIO_VALUES,
  IMAGE_QUALITY_VALUES,
  VIDEO_QUALITY_VALUES,
  VIDEO_DURATION_OPTIONS,
  MOTION_OPTIONS,
  STYLE_PRESETS,
  getDimensionsForAspectRatio,
  getRecommendedQuality,
} from './domain/constants/GenerationConstants';
// New canonical option tables live in domain/limits.
export {
  ASPECT_RATIO_OPTIONS,
  IMAGE_QUALITY_OPTIONS,
  VIDEO_QUALITY_OPTIONS,
  VIDEO_DURATION_OPTIONS_SECONDS,
} from './domain/limits/ImageFormatOptions';

// Domain Layer - Entities
export type { BlogGenerationRequest, GeneratedBlog, SocialContentRequest, GeneratedSocialContent, VideoScriptRequest, GeneratedVideoScript, ContentCalendarEntry } from './domain/entities/ContentGeneration';
export type { ContentAnalysisRequest, ContentAnalysisResult, SentimentAnalysisResult } from './domain/entities/SentimentAnalysis';
export type { SEOOptimizationRequest, SEOOptimizationResult, SEOScoreBreakdown, KeywordAnalysis } from './domain/entities/SEO';
export type { ABTestRequest, ABTestPrediction, ABTestComparison, ABTestVariant } from './domain/entities/ABTesting';

// Domain Layer - Interfaces
export type { IAIContentService } from './domain/interfaces/IAIContentService';
export type { ITextGenerator, TextGenerationOptions } from './domain/interfaces/ITextGenerator';

// Domain Layer - Errors
export {
  AIError,
  ValidationError,
  ProviderUnavailableError,
  ProviderQuotaExhaustedError,
} from './domain/errors/AIErrors';
export type { AIErrorCode } from './domain/errors/AIErrors';

// Application Layer - Services
export { AIContentService } from './application/services/AIContentService';
export { BlogService } from './application/services/BlogService';
export { SocialService } from './application/services/SocialService';
export { VideoScriptService } from './application/services/VideoScriptService';
export { AnalysisService } from './application/services/AnalysisService';
export { SeoService } from './application/services/SeoService';
export { ABTestService } from './application/services/ABTestService';
export { ImagePromptService } from './application/services/ImagePromptService';
export { ContentCalendarService } from './application/services/ContentCalendarService';
export { MediaGenerationService } from './application/services/ProviderServices';
export { GenerationExecutor } from './application/services/GenerationExecutor';

// Application Layer - Flows
export type { WizardStep, WizardConfig, WizardData, ValidationResult } from './application/flows/base.wizard';
export type {
  ContentWizardStep,
  ContentWizardData,
  ContentType as ContentWizardType,
} from './application/flows/content.wizard';
export {
  CONTENT_WIZARD_STEPS,
  buildContentRequest,
} from './application/flows/content.wizard';
export type {
  ImageWizardStep,
  ImageWizardData,
} from './application/flows/image.wizard';
export {
  IMAGE_WIZARD_STEPS,
  buildImageRequest,
} from './application/flows/image.wizard';
export type {
  VideoWizardStep,
  VideoWizardData,
  VideoGenerationType,
} from './application/flows/video.wizard';
export {
  VIDEO_WIZARD_STEPS,
  buildVideoRequest,
} from './application/flows/video.wizard';

// Infrastructure Layer - Providers
export type { IAIProvider, BaseAIProvider } from './infrastructure/providers/base.provider';
export { ProviderError } from './infrastructure/providers/base.provider';
export { ProviderFactory, createProviderFactory } from './infrastructure/providers/provider.factory';
export { GroqProvider, createGroqProvider } from './infrastructure/providers/groq.provider';
export { FalProvider, createFalProvider } from './infrastructure/providers/fal.provider';
export { GeminiProvider, createGeminiProvider } from './infrastructure/providers/gemini.provider';
export { PrunaProvider, createPrunaProvider, generateWithPruna } from './infrastructure/providers/pruna.provider';

// Presentation Layer - Hooks
export { useAIContent } from './presentation/hooks/useAIContent';
export type { UseAIContentOptions, UseAIContentReturn } from './presentation/hooks/useAIContent';
export { useContentWizard } from './presentation/hooks/useContentWizard';
export { useImageWizard } from './presentation/hooks/useImageWizard';
export { useVideoWizard } from './presentation/hooks/useVideoWizard';
export { useBlogGenerator } from './presentation/hooks/useBlogGenerator';
export { useSocialContentGenerator } from './presentation/hooks/useSocialContentGenerator';
export { useAIGeneration } from './presentation/hooks/useAIGeneration';
export type {
  UseAIGenerationOptions,
  UseAIGenerationReturn,
  UploadFunction,
  SaveFunction,
  CreditCheckFunction,
} from './presentation/hooks/useAIGeneration';
