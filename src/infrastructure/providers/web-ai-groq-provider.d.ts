/**
 * Type declarations for the optional @umituz/web-ai-groq-provider peer module.
 * The runtime import is dynamic, so we describe the contract here for
 * TypeScript without forcing the dependency at build time.
 */

declare module '@umituz/web-ai-groq-provider' {
  export interface GroqGenerationConfig {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }

  export interface GroqGenerationOptions {
    model?: string;
    generationConfig?: GroqGenerationConfig;
    schema?: Record<string, unknown>;
  }

  export interface GroqTextService {
    generateCompletion(prompt: string, options: GroqGenerationOptions): Promise<string>;
    generateStructured<T = Record<string, unknown>>(prompt: string, options: GroqGenerationOptions): Promise<T>;
    streamCompletion(
      prompt: string,
      callbacks: { onChunk: (chunk: string) => void; onComplete: (full: string) => void },
      options: GroqGenerationOptions,
    ): Promise<void>;
  }

  export interface GroqHttpClient {
    initialize?(config: unknown): void;
    isInitialized?(): boolean;
  }

  export const textGenerationService: GroqTextService;
  export const groqHttpClient: GroqHttpClient;
}
