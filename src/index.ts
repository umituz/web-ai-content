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
 *   const { generateImage, generateVideo, isLoading } = useAIContent({
 *     providers: AI_PROVIDER_CONFIG,
 *   });
 *
 *   const handleGenerateImage = async () => {
 *     await generateImage({
 *       type: 'image',
 *       prompt: 'A futuristic city with neon lights',
 *       style: 'realistic',
 *       format: 'square',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleGenerateImage} disabled={isLoading}>
 *       Generate Image
 *     </button>
 *   );
 * }
 * ```
 */

// Domain Layer - Types and Config
export type { SocialPlatform, ContentTone, ContentType, Emotion, Sentiment, BlogType, PlatformSpecs, PLATFORM_SPECS } from './domain/types';
export type { ProviderConfig, ProviderHealth, ProviderType, BaseProviderConfig, GroqConfig, FalConfig, PrunaConfig, GeminiConfig } from './domain/config/ProviderConfig';
export type { GenerationRequest, TextGenerationRequest, ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest, GeneratedContent } from './domain/config/ProviderConfig';

// Domain Layer - Entities
export type { BlogGenerationRequest, GeneratedBlog, SocialContentRequest, GeneratedSocialContent, VideoScriptRequest, GeneratedVideoScript, ContentCalendarEntry } from './domain/entities/ContentGeneration';
export type { ContentAnalysisRequest, ContentAnalysisResult, SentimentAnalysisResult } from './domain/entities/SentimentAnalysis';
export type { SEOOptimizationRequest, SEOOptimizationResult, SEOScoreBreakdown, KeywordAnalysis } from './domain/entities/SEO';
export type { ABTestRequest, ABTestPrediction, ABTestComparison } from './domain/entities/ABTesting';

// Domain Layer - Interfaces
export type { IAIContentService, IAIProvider, TextGenerationOptions } from './domain/interfaces/IAIContentService';

// Application Layer - Services
export { AIContentService } from './application/services/AIContentService';

// Application Layer - Flows
export type { WizardStep, WizardConfig, WizardData, ValidationResult } from './application/flows/base.wizard';
export type { ContentWizardStep, ContentWizardData, ContentWizard } from './application/flows/content.wizard';
export type { ImageWizardStep, ImageWizardData, ImageWizard } from './application/flows/image.wizard';
export type { VideoWizardStep, VideoWizardData, VideoWizard } from './application/flows/video.wizard';
export { createWizardFlow, createContentWizard, createImageWizard, createVideoWizard } from './application/flows';

// Infrastructure Layer - Providers
export type { IAIProvider as IAIProviderInterface, BaseAIProvider, ProviderError, ProviderUnavailableError, ProviderQuotaExhaustedError } from './infrastructure/providers/base.provider';
export type { ProviderFactory } from './infrastructure/providers/provider.factory';
export { createProviderFactory } from './infrastructure/providers/provider.factory';
export { GroqProvider, createGroqProvider } from './infrastructure/providers/groq.provider';
export { FalProvider, createFalProvider } from './infrastructure/providers/fal.provider';
export { GeminiProvider, createGeminiProvider } from './infrastructure/providers/gemini.provider';
export { PrunaProvider, createPrunaProvider } from './infrastructure/providers/pruna.provider';

// Presentation Layer - Hooks
export { useAIContent } from './presentation/hooks/useAIContent';
export { useContentWizard } from './presentation/hooks/useContentWizard';
export { useImageWizard } from './presentation/hooks/useImageWizard';
export { useVideoWizard } from './presentation/hooks/useVideoWizard';
export { useBlogGenerator } from './presentation/hooks/useBlogGenerator';
export { useSocialContentGenerator } from './presentation/hooks/useSocialContentGenerator';
