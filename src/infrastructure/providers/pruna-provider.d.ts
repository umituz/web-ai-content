/**
 * Type declarations for the optional @umituz/pruna-provider peer module.
 * Mirrors the runtime surface used by pruna-generate.ts.
 */

declare module '@umituz/pruna-provider/core' {
  export type PrunaStage = 'uploading' | 'processing' | 'polling' | 'predicting';

  export interface PrunaResult {
    url: string;
    model?: string;
  }

  export interface PrunaChunk {
    stage: PrunaStage;
    result?: PrunaResult;
    error?: Error;
  }

  export interface PrunaRequest {
    model?: string;
    image?: string;
    [key: string]: unknown;
  }

  export function generateWithPruna(
    request: PrunaRequest,
    apiKey: string,
    signal?: AbortSignal,
    onProgress?: (stage: PrunaStage, attempt?: number) => void,
  ): AsyncGenerator<PrunaChunk>;

  export function submitPrediction(
    modelId: string,
    request: PrunaRequest,
    apiKey: string,
    signal?: AbortSignal,
    onProgress?: (stage: PrunaStage, attempt?: number) => void,
  ): Promise<{ output?: { url?: string }; status_url?: string; generation_url?: string }>;

  export function pollForResult(
    pollUrl: string,
    apiKey: string,
    maxAttempts: number,
    intervalMs: number,
    signal?: AbortSignal,
    onProgress?: (stage: PrunaStage, attempt?: number) => void,
  ): Promise<string>;
}
