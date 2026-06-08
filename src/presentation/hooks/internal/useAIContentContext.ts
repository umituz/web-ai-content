/**
 * useAIContentContext
 * Centralizes shared state (loading, progress, error) and stable
 * service instance creation for the useAIContent family of hooks.
 * Eliminates 17+ duplicated try/catch blocks across callbacks.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AIContentService } from '../../../application/services/AIContentService';
import { AIError, type AIErrorCode } from '../../../domain/errors/AIErrors';
import type { ProviderConfig } from '../../../domain/config/ProviderConfig';

export interface AsyncContext {
  isLoading: boolean;
  progress: number;
  error: string | null;
  errorCode: AIErrorCode | null;
  setError: (msg: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  reportProgress: (value: number) => void;
  reportError: (error: unknown, fallbackMessage: string) => AIError;
  execute: <T>(
    operation: () => Promise<T>,
    fallbackMessage: string,
    options?: { reportProgress?: boolean },
  ) => Promise<T | null>;
}

export interface AIOptionCallbacks {
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export interface UseAIContentContextOptions {
  providers?: ProviderConfig;
  apiKey?: string;
  model?: string;
  callbacks?: AIOptionCallbacks;
}

export interface UseAIContentContextReturn {
  service: AIContentService;
  ctx: AsyncContext;
}

export function useAIContentContext(options: UseAIContentContextOptions): UseAIContentContextReturn {
  const { providers, apiKey, model, callbacks } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AIErrorCode | null>(null);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Stable service creation by reference identity of providers/apiKey
  const service = useMemo(() => {
    if (providers) {
      return new AIContentService(providers);
    }
    if (apiKey) {
      return new AIContentService(apiKey, model);
    }
    throw new Error('Either providers or apiKey must be provided to useAIContent');
  }, [providers, apiKey, model]);

  const reportProgress = useCallback((value: number) => {
    setProgress(value);
    callbacksRef.current?.onProgress?.(value);
  }, []);

  const reportError = useCallback((err: unknown, fallbackMessage: string): AIError => {
    const aiError = AIError.from(err, 'UNKNOWN');
    const finalError = aiError.message ? aiError : new AIError(fallbackMessage, 'UNKNOWN', err);
    setError(finalError.message);
    setErrorCode(finalError.code);
    callbacksRef.current?.onError?.(finalError);
    return finalError;
  }, []);

  const execute = useCallback(
    async <T>(
      operation: () => Promise<T>,
      fallbackMessage: string,
      execOptions?: { reportProgress?: boolean },
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      if (execOptions?.reportProgress) {
        setProgress(0);
      }
      try {
        const result = await operation();
        if (execOptions?.reportProgress) {
          reportProgress(100);
        }
        return result;
      } catch (err) {
        const aiError = AIError.from(err, 'UNKNOWN');
        if (aiError.message) {
          reportError(aiError, fallbackMessage);
        } else {
          reportError(new Error(fallbackMessage), fallbackMessage);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [reportError, reportProgress],
  );

  const ctx: AsyncContext = {
    isLoading,
    progress,
    error,
    errorCode,
    setError: (msg) => {
      setError(msg);
      setErrorCode(msg ? 'UNKNOWN' : null);
    },
    setIsLoading,
    setProgress,
    reportProgress,
    reportError,
    execute,
  };

  return { service, ctx };
}
