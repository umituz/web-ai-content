import { useState, useCallback, useMemo, useRef } from 'react';
import { AIContentService } from '../../application/services/AIContentService';
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
} from '../../domain/entities/SEO';
import type {
  ABTestRequest,
  ABTestPrediction,
  ABTestComparison,
} from '../../domain/entities/ABTesting';
import type { ContentTone, Emotion } from '../../domain/types';
import type { ProviderConfig } from '../../domain/config/ProviderConfig';
import type { ImageGenerationRequest, VideoGenerationRequest, ImageToVideoRequest, VideoToVideoRequest, GeneratedContent } from '../../domain/config/ProviderConfig';

interface UseAIContentOptions {
  providers?: ProviderConfig;
  apiKey?: string; // Deprecated: Use providers instead
  model?: string;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface UseAIContentReturn {
  // State
  isLoading: boolean;
  progress: number;
  error: string | null;

  // Blog Generation
  generateBlogPost: (request: BlogGenerationRequest) => Promise<GeneratedBlog | null>;

  // Social Content
  generateSocialContent: (request: SocialContentRequest) => Promise<GeneratedSocialContent | null>;
  generateForAllPlatforms: (topic: string, tone: ContentTone) => Promise<GeneratedSocialContent[]>;

  // Video Scripts
  generateVideoScript: (request: VideoScriptRequest) => Promise<GeneratedVideoScript | null>;

  // Content Calendar
  generateContentCalendar: (niche: string, days: number) => Promise<ContentCalendarEntry[]>;

  // Analysis
  analyzeSentiment: (content: string) => Promise<SentimentAnalysisResult | null>;
  analyzeContent: (request: ContentAnalysisRequest) => Promise<ContentAnalysisResult | null>;

  // SEO
  optimizeSEO: (request: SEOOptimizationRequest) => Promise<SEOOptimizationResult | null>;
  calculateSEOScore: (content: string, keywords: string[]) => Promise<SEOScoreBreakdown | null>;

  // A/B Testing
  predictABTest: (request: ABTestRequest) => Promise<ABTestPrediction[]>;
  compareVariants: (variantA: string, variantB: string) => Promise<ABTestComparison | null>;

  // Hashtags
  generateHashtags: (content: string, count: number) => Promise<string[]>;

  // Image Prompts
  generateImagePrompt: (description: string, style: string) => Promise<string | null>;

  // Voice Content
  generateVoiceScript: (topic: string, emotion: Emotion, duration: number) => Promise<GeneratedVideoScript | null>;

  // NEW: Image Generation
  generateImage: (request: ImageGenerationRequest) => Promise<GeneratedContent | null>;

  // NEW: Video Generation
  generateVideo: (request: VideoGenerationRequest) => Promise<GeneratedContent | null>;

  // NEW: Image to Video
  convertImageToVideo: (request: ImageToVideoRequest) => Promise<GeneratedContent | null>;

  // NEW: Video to Video
  transformVideo: (request: VideoToVideoRequest) => Promise<GeneratedContent | null>;
}

export function useAIContent(options: UseAIContentOptions): UseAIContentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Stabilize callbacks with refs to avoid unnecessary re-renders
  const onProgressRef = useRef(options.onProgress);
  const onErrorRef = useRef(options.onError);

  // Update refs when callbacks change
  useMemo(() => {
    onProgressRef.current = options.onProgress;
    onErrorRef.current = options.onError;
  }, [options.onProgress, options.onError]);

  // Use ref to track if service has been created with these exact configs
  const serviceRef = useRef<{
    service: AIContentService;
    providers: ProviderConfig | string;
    model?: string;
  } | null>(null);

  const service = useMemo(() => {
    const configKey = options.providers || options.apiKey;
    const modelKey = options.model;

    // Check if we can reuse existing service
    if (serviceRef.current &&
        serviceRef.current.providers === configKey &&
        serviceRef.current.model === modelKey) {
      return serviceRef.current.service;
    }

    // Create new service
    let newService: AIContentService;
    if (options.providers) {
      newService = new AIContentService(options.providers);
    } else if (options.apiKey) {
      newService = new AIContentService(options.apiKey, options.model);
    } else {
      throw new Error('Either providers or apiKey must be provided');
    }

    // Cache the service
    serviceRef.current = {
      service: newService,
      providers: configKey,
      model: modelKey,
    };

    return newService;
  }, [options.providers, options.apiKey, options.model]);

  const generateBlogPost = useCallback(async (request: BlogGenerationRequest) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await service.generateBlogPost(request);
      setProgress(100);
      onProgressRef.current?.(100);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate blog post');
      setError(error.message);
      onErrorRef.current?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const generateSocialContent = useCallback(async (request: SocialContentRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.generateSocialContent(request);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate social content');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const generateForAllPlatforms = useCallback(async (topic: string, tone: ContentTone) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.generateForAllPlatforms(topic, tone);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const generateVideoScript = useCallback(async (request: VideoScriptRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.generateVideoScript(request);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video script');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const generateContentCalendar = useCallback(async (niche: string, days: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.generateContentCalendar(niche, days);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate calendar');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const analyzeSentiment = useCallback(async (content: string): Promise<SentimentAnalysisResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.analyzeSentiment(content);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sentiment');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const analyzeContent = useCallback(async (request: ContentAnalysisRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.analyzeContent(request);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze content');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const optimizeSEO = useCallback(async (request: SEOOptimizationRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.optimizeSEO(request);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize SEO');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const calculateSEOScore = useCallback(async (content: string, keywords: string[]): Promise<SEOScoreBreakdown | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.calculateSEOScore(content, keywords);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate SEO score');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const predictABTest = useCallback(async (request: ABTestRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.predictABTest(request);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict A/B test');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const compareVariants = useCallback(async (variantA: string, variantB: string): Promise<ABTestComparison | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.compareVariants(variantA, variantB);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare variants');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const generateHashtags = useCallback(async (content: string, count: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.generateHashtags(content, count);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate hashtags');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const generateImagePrompt = useCallback(async (description: string, style: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.generateImagePrompt(description, style);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image prompt');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const generateVoiceScript = useCallback(async (topic: string, emotion: Emotion, duration: number) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await service.generateVoiceScript(topic, emotion, duration);
      setProgress(100);
      onProgressRef.current?.(100);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate voice script');
      setError(error.message);
      onErrorRef.current?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // NEW: Image generation
  const generateImage = useCallback(async (request: ImageGenerationRequest) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await service.generateImage(request);
      setProgress(100);
      onProgressRef.current?.(100);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate image');
      setError(error.message);
      onErrorRef.current?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // NEW: Video generation
  const generateVideo = useCallback(async (request: VideoGenerationRequest) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await service.generateVideo(request);
      setProgress(100);
      onProgressRef.current?.(100);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate video');
      setError(error.message);
      onErrorRef.current?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // NEW: Image to video
  const convertImageToVideo = useCallback(async (request: ImageToVideoRequest) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await service.convertImageToVideo(request);
      setProgress(100);
      onProgressRef.current?.(100);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to convert image to video');
      setError(error.message);
      onErrorRef.current?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // NEW: Video to video
  const transformVideo = useCallback(async (request: VideoToVideoRequest) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await service.transformVideo(request);
      setProgress(100);
      onProgressRef.current?.(100);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to transform video');
      setError(error.message);
      onErrorRef.current?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  return {
    isLoading,
    progress,
    error,
    generateBlogPost,
    generateSocialContent,
    generateForAllPlatforms,
    generateVideoScript,
    generateContentCalendar,
    analyzeSentiment,
    analyzeContent,
    optimizeSEO,
    calculateSEOScore,
    predictABTest,
    compareVariants,
    generateHashtags,
    generateImagePrompt,
    generateVoiceScript,
    generateImage,
    generateVideo,
    convertImageToVideo,
    transformVideo,
  };
}
