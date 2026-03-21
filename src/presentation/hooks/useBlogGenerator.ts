import { useState, useCallback } from 'react';
import { AIContentService } from '../application/services/AIContentService';
import type { BlogGenerationRequest, GeneratedBlog } from '../domain/entities/ContentGeneration';

interface UseBlogGeneratorOptions {
  apiKey: string;
  model?: string;
}

interface UseBlogGeneratorReturn {
  // State
  isGenerating: boolean;
  generatedBlog: GeneratedBlog | null;
  error: string | null;

  // Actions
  generateBlog: (request: BlogGenerationRequest) => Promise<void>;
  reset: () => void;
}

export function useBlogGenerator(options: UseBlogGeneratorOptions): UseBlogGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlog, setGeneratedBlog] = useState<GeneratedBlog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const service = new AIContentService(options.apiKey, options.model);

  const generateBlog = useCallback(async (request: BlogGenerationRequest) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await service.generateBlogPost(request);
      setGeneratedBlog(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blog post');
    } finally {
      setIsGenerating(false);
    }
  }, [service]);

  const reset = useCallback(() => {
    setGeneratedBlog(null);
    setError(null);
  }, []);

  return {
    isGenerating,
    generatedBlog,
    error,
    generateBlog,
    reset,
  };
}
