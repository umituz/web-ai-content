/**
 * useBlogGenerator
 * Specialized hook for blog post generation.
 * Delegates to the AIContentService through the shared useAIContentContext.
 */

import { useCallback, useState } from 'react';
import type { BlogGenerationRequest, GeneratedBlog } from '../../domain/entities/ContentGeneration';
import { useAIContentContext } from './internal/useAIContentContext';

export interface UseBlogGeneratorOptions {
  apiKey: string;
  model?: string;
}

export interface UseBlogGeneratorReturn {
  isGenerating: boolean;
  generatedBlog: GeneratedBlog | null;
  error: string | null;
  generateBlog: (request: BlogGenerationRequest) => Promise<void>;
  reset: () => void;
}

export function useBlogGenerator(options: UseBlogGeneratorOptions): UseBlogGeneratorReturn {
  const { service, ctx } = useAIContentContext({
    apiKey: options.apiKey,
    model: options.model,
  });
  const [generatedBlog, setGeneratedBlog] = useState<GeneratedBlog | null>(null);

  const generateBlog = useCallback(
    async (request: BlogGenerationRequest) => {
      const result = await ctx.execute(
        () => service.generateBlogPost(request),
        'Failed to generate blog post',
      );
      if (result) setGeneratedBlog(result);
    },
    [ctx, service],
  );

  const reset = useCallback(() => {
    setGeneratedBlog(null);
    ctx.setError(null);
  }, [ctx]);

  return {
    isGenerating: ctx.isLoading,
    generatedBlog,
    error: ctx.error,
    generateBlog,
    reset,
  };
}
