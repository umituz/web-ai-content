import { useState, useCallback } from 'react';
import { AIContentService } from '../application/services/AIContentService';
import type { SocialContentRequest, GeneratedSocialContent } from '../domain/entities/ContentGeneration';
import type { ContentTone, SocialPlatform } from '../domain/types';

interface UseSocialContentGeneratorOptions {
  apiKey: string;
  model?: string;
}

interface UseSocialContentGeneratorReturn {
  // State
  isGenerating: boolean;
  generatedContents: GeneratedSocialContent[];
  error: string | null;

  // Actions
  generateForPlatform: (request: SocialContentRequest) => Promise<void>;
  generateForAllPlatforms: (topic: string, tone: ContentTone) => Promise<void>;
  reset: () => void;
}

export function useSocialContentGenerator(
  options: UseSocialContentGeneratorOptions
): UseSocialContentGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContents, setGeneratedContents] = useState<GeneratedSocialContent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const service = new AIContentService(options.apiKey, options.model);

  const generateForPlatform = useCallback(async (request: SocialContentRequest) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await service.generateSocialContent(request);
      setGeneratedContents([result]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  }, [service]);

  const generateForAllPlatforms = useCallback(async (topic: string, tone: ContentTone) => {
    setIsGenerating(true);
    setError(null);
    try {
      const results = await service.generateForAllPlatforms(topic, tone);
      setGeneratedContents(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  }, [service]);

  const reset = useCallback(() => {
    setGeneratedContents([]);
    setError(null);
  }, []);

  return {
    isGenerating,
    generatedContents,
    error,
    generateForPlatform,
    generateForAllPlatforms,
    reset,
  };
}
