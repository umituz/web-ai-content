/**
 * useAIGeneration Hook
 * Orchestrates AI content generation with upload, generate, and save steps
 *
 * Similar to mobile's useGenerationOrchestrator but optimized for web
 */

import { useState, useCallback, useRef } from 'react';
import type {
  GenerationType,
  ImageGenerationInput,
  VideoGenerationInput,
  GenerationResult,
  GenerationStatus,
  GenerationProgress,
  ImageQuality,
  VideoQuality,
} from '../../domain/types/GenerationTypes';
import { generateWithPruna } from '../../infrastructure/providers/pruna.provider';
import { calculateCreditCost } from '../../domain/types/GenerationTypes';

/**
 * Upload function type
 */
export type UploadFunction = (file: File, userId: string) => Promise<string>;

/**
 * Save function type
 */
export type SaveFunction = (result: Omit<GenerationResult, 'id' | 'createdAt'>) => Promise<void>;

/**
 * Credit check function type
 */
export type CreditCheckFunction = (cost: number) => boolean;

/**
 * Hook options
 */
export interface UseAIGenerationOptions {
  userId?: string;
  apiKey: string;
  uploadPhoto?: UploadFunction;
  saveResult?: SaveFunction;
  checkCredits?: CreditCheckFunction;
  onSuccess?: (result: GenerationResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: GenerationProgress) => void;
}

/**
 * Hook return
 */
export interface UseAIGenerationReturn {
  status: GenerationStatus;
  result: GenerationResult | null;
  error: Error | null;
  progress: GenerationProgress | null;

  // Actions
  generateImage: (input: ImageGenerationInput) => Promise<GenerationResult | null>;
  generateVideo: (input: VideoGenerationInput) => Promise<GenerationResult | null>;
  generateFromFiles: (
    files: File[],
    type: GenerationType,
    prompt: string,
    quality?: ImageQuality | VideoQuality,
  ) => Promise<GenerationResult | null>;

  // Callbacks (for custom implementations)
  saveResult?: SaveFunction;

  // Controls
  cancel: () => void;
  reset: () => void;
}

/**
 * AI Generation Orchestrator Hook
 *
 * Orchestrates the full generation pipeline:
 * 1. Upload files (if any)
 * 2. Check credits
 * 3. Generate content
 * 4. Save result
 *
 * @example
 * ```tsx
 * const { generateImage, status, result, error } = useAIGeneration({
 *   userId: user.uid,
 *   apiKey: prunaApiKey,
 *   uploadPhoto: storageService.uploadPhoto,
 *   saveResult: addPhoto,
 *   checkCredits: (cost) => (profile?.credits ?? 0) >= cost,
 * });
 *
 * await generateImage({
 *   type: 'text-to-image',
 *   prompt: 'A beautiful sunset',
 *   aspectRatio: '16:9',
 *   quality: 'hd',
 * });
 * ```
 */
export function useAIGeneration(options: UseAIGenerationOptions): UseAIGenerationReturn {
  const {
    userId,
    apiKey,
    uploadPhoto,
    saveResult,
    checkCredits,
    onSuccess,
    onError,
    onProgress,
  } = options;

  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setResult(null);
    setError(null);
    setProgress(null);
  }, []);

  /**
   * Cancel current generation
   */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus('cancelled');
  }, []);

  /**
   * Upload files and get URLs
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!uploadPhoto || !userId) {
        throw new Error('uploadPhoto and userId are required for file uploads');
      }

      setStatus('uploading');
      setProgress({ stage: 'uploading', progress: 0, message: 'Uploading files...' });

      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadPhoto(files[i], userId);
        urls.push(url);
        setProgress({
          stage: 'uploading',
          progress: ((i + 1) / files.length) * 100,
          message: `Uploaded ${i + 1}/${files.length} files`,
        });
      }

      return urls;
    },
    [uploadPhoto, userId],
  );

  /**
   * Generate image
   */
  const generateImage = useCallback(
    async (input: ImageGenerationInput): Promise<GenerationResult | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setStatus('processing');
        setError(null);

        // Check credits
        const cost = calculateCreditCost(input.type, input.quality);
        if (checkCredits && !checkCredits(cost)) {
          throw new Error(`Insufficient credits. Required: ${cost}`);
        }

        // Upload image if needed (for image-to-image)
        let imageUrl = input.image;
        if (input.image && uploadPhoto && userId) {
          // Check if it's a base64 string (not a URL)
          if (input.image.startsWith('data:')) {
            // Convert base64 to File
            const response = await fetch(input.image);
            const blob = await response.blob();
            const file = new File([blob], 'image.jpg', { type: blob.type });
            imageUrl = await uploadPhoto(file, userId);
          }
        }

        // Build request
        const request = {
          type: input.type,
          prompt: input.prompt,
          imageUrl: imageUrl,
          aspectRatio: input.aspectRatio,
          quality: input.quality,
        } as ImageGenerationInput;

        // Generate
        setStatus('processing');
        setProgress({ stage: 'processing', progress: 0, message: 'Starting generation...' });

        let finalUrl: string | undefined;
        for await (const chunk of generateWithPruna(request, apiKey, controller.signal, (stage) => {
          setProgress({ stage, progress: 50, message: `Generating... (${stage})` });
          onProgress?.({ stage, progress: 50, message: `Generating... (${stage})` });
        })) {
          if (chunk.error) {
            throw chunk.error;
          }
          if (chunk.result) {
            finalUrl = chunk.result.url;
          }
        }

        if (!finalUrl) {
          throw new Error('Generation failed: No result received');
        }

        // Build result
        const generationResult: GenerationResult = {
          id: `gen-${Date.now()}`,
          type: input.type,
          url: finalUrl,
          thumbnailUrl: finalUrl, // Use same URL for thumbnail
          status: 'completed',
          metadata: {
            provider: 'pruna',
            model: input.type === 'image-to-image' ? 'p-image-edit' : 'p-image',
            prompt: input.prompt,
            quality: input.quality,
            aspectRatio: input.aspectRatio,
            style: input.style,
          },
          createdAt: new Date().toISOString(),
        };

        setResult(generationResult);
        setStatus('completed');
        setProgress({ stage: 'processing', progress: 100, message: 'Complete!' });

        // Save result
        if (saveResult) {
          await saveResult(generationResult);
        }

        onSuccess?.(generationResult);
        return generationResult;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setStatus('failed');
        setProgress(null);
        onError?.(e);
        return null;
      }
    },
    [apiKey, uploadPhoto, saveResult, checkCredits, onSuccess, onError, onProgress, userId],
  );

  /**
   * Generate video
   */
  const generateVideo = useCallback(
    async (input: VideoGenerationInput): Promise<GenerationResult | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setStatus('processing');
        setError(null);

        // Check credits
        const cost = calculateCreditCost(input.type, input.quality);
        if (checkCredits && !checkCredits(cost)) {
          throw new Error(`Insufficient credits. Required: ${cost}`);
        }

        // Upload image if needed (for image-to-video)
        let imageUrl = input.image;
        if (input.image && uploadPhoto && userId) {
          // Check if it's a base64 string (not a URL)
          if (input.image.startsWith('data:')) {
            // Convert base64 to File
            const response = await fetch(input.image);
            const blob = await response.blob();
            const file = new File([blob], 'image.jpg', { type: blob.type });
            imageUrl = await uploadPhoto(file, userId);
          }
        }

        // Build request
        const request = {
          type: input.type,
          prompt: input.prompt,
          image: imageUrl,
          duration: input.duration,
          aspectRatio: input.aspectRatio,
          quality: input.quality,
        } as VideoGenerationInput;

        // Generate
        setStatus('processing');
        setProgress({ stage: 'processing', progress: 0, message: 'Starting generation...' });

        let finalUrl: string | undefined;
        for await (const chunk of generateWithPruna(request, apiKey, controller.signal, (stage) => {
          setProgress({ stage, progress: 50, message: `Generating... (${stage})` });
          onProgress?.({ stage, progress: 50, message: `Generating... (${stage})` });
        })) {
          if (chunk.error) {
            throw chunk.error;
          }
          if (chunk.result) {
            finalUrl = chunk.result.url;
          }
        }

        if (!finalUrl) {
          throw new Error('Generation failed: No result received');
        }

        // Build result
        const generationResult: GenerationResult = {
          id: `gen-${Date.now()}`,
          type: input.type,
          url: finalUrl,
          thumbnailUrl: finalUrl, // Use same URL for thumbnail
          status: 'completed',
          metadata: {
            provider: 'pruna',
            model: input.type === 'image-to-video' ? 'p-video' : 'p-video',
            prompt: input.prompt,
            duration: input.duration,
            quality: input.quality,
            aspectRatio: input.aspectRatio,
          },
          createdAt: new Date().toISOString(),
        };

        setResult(generationResult);
        setStatus('completed');
        setProgress({ stage: 'processing', progress: 100, message: 'Complete!' });

        // Save result
        if (saveResult) {
          await saveResult(generationResult);
        }

        onSuccess?.(generationResult);
        return generationResult;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setStatus('failed');
        setProgress(null);
        onError?.(e);
        return null;
      }
    },
    [apiKey, uploadPhoto, saveResult, checkCredits, onSuccess, onError, onProgress, userId],
  );

  /**
   * Generate from files (convenience method)
   */
  const generateFromFiles = useCallback(
    async (
      files: File[],
      type: GenerationType,
      prompt: string,
      quality?: ImageQuality | VideoQuality,
    ): Promise<GenerationResult | null> => {
      try {
        // Upload files
        const urls = await uploadFiles(files);

        // Determine generation type
        if (type === 'image-to-image' || type === 'image-to-video') {
          const imageUrl = urls[0];
          if (type === 'image-to-image') {
            return await generateImage({
              type: 'image-to-image',
              prompt,
              image: imageUrl,
              quality: quality as ImageQuality,
            });
          } else {
            return await generateVideo({
              type: 'image-to-video',
              prompt,
              image: imageUrl,
              quality: quality as VideoQuality,
            });
          }
        } else {
          // Text to image/video
          if (type === 'text-to-image') {
            return await generateImage({
              type: 'text-to-image',
              prompt,
              quality: quality as ImageQuality,
            });
          } else {
            return await generateVideo({
              type: 'text-to-video',
              prompt,
              quality: quality as VideoQuality,
            });
          }
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setStatus('failed');
        onError?.(e);
        return null;
      }
    },
    [uploadFiles, generateImage, generateVideo, onError],
  );

  return {
    status,
    result,
    error,
    progress,
    generateImage,
    generateVideo,
    generateFromFiles,
    saveResult,
    cancel,
    reset,
  };
}
