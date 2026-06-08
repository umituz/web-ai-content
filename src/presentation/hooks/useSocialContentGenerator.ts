/**
 * useSocialContentGenerator
 * Specialized hook for social content generation.
 * Delegates to the AIContentService through the shared useAIContentContext.
 */

import { useCallback, useState } from 'react';
import type { SocialContentRequest, GeneratedSocialContent } from '../../domain/entities/ContentGeneration';
import type { ContentTone } from '../../domain/types';
import { useAIContentContext } from './internal/useAIContentContext';

export interface UseSocialContentGeneratorOptions {
  apiKey: string;
  model?: string;
}

export interface UseSocialContentGeneratorReturn {
  isGenerating: boolean;
  generatedContents: GeneratedSocialContent[];
  error: string | null;
  generateForPlatform: (request: SocialContentRequest) => Promise<void>;
  generateForAllPlatforms: (topic: string, tone: ContentTone) => Promise<void>;
  reset: () => void;
}

export function useSocialContentGenerator(
  options: UseSocialContentGeneratorOptions,
): UseSocialContentGeneratorReturn {
  const { service, ctx } = useAIContentContext({
    apiKey: options.apiKey,
    model: options.model,
  });
  const [generatedContents, setGeneratedContents] = useState<GeneratedSocialContent[]>([]);

  const generateForPlatform = useCallback(
    async (request: SocialContentRequest) => {
      const result = await ctx.execute(
        () => service.generateSocialContent(request),
        'Failed to generate content',
      );
      if (result) setGeneratedContents([result]);
    },
    [ctx, service],
  );

  const generateForAllPlatforms = useCallback(
    async (topic: string, tone: ContentTone) => {
      const results = await ctx.execute(
        () => service.generateForAllPlatforms(topic, tone),
        'Failed to generate content',
      );
      if (results) setGeneratedContents(results);
    },
    [ctx, service],
  );

  const reset = useCallback(() => {
    setGeneratedContents([]);
    ctx.setError(null);
  }, [ctx]);

  return {
    isGenerating: ctx.isLoading,
    generatedContents,
    error: ctx.error,
    generateForPlatform,
    generateForAllPlatforms,
    reset,
  };
}
