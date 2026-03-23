import { useState, useCallback, useMemo } from 'react';
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

interface UseAIContentOptions {
  apiKey: string;
  model?: string;
}

interface UseAIContentReturn {
  // State
  isLoading: boolean;
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
}

export function useAIContent(options: UseAIContentOptions): UseAIContentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(() => new AIContentService(options.apiKey, options.model), [options.apiKey, options.model]);

  const generateBlogPost = useCallback(async (request: BlogGenerationRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await service.generateBlogPost(request);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blog post');
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
    setError(null);
    try {
      const result = await service.generateVoiceScript(topic, emotion, duration);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate voice script');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  return {
    isLoading,
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
  };
}
