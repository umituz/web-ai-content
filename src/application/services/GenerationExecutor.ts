/**
 * Generation Executor
 * Centralized helper that handles the universal "call model → parse JSON → fallback"
 * cycle. Eliminates 7+ duplicate try/catch blocks scattered across the service
 * module and keeps callers focused on what they generate, not how.
 */

import { parseAIResponse } from '../../infrastructure/utils/jsonParser';
import type { ITextGenerator, TextGenerationOptions } from '../../domain/interfaces/ITextGenerator';

export class GenerationExecutor {
  constructor(private readonly generator: ITextGenerator) {}

  /**
   * Run a JSON-based generation in one call: prompt → text → parsed JSON → fallback if needed.
   */
  async runJson<T>(prompt: string, fallback: T, generationOptions: TextGenerationOptions = {}): Promise<T> {
    const response = await this.generator.generateText(prompt, generationOptions);
    return parseAIResponse<T>(response, fallback);
  }

  /**
   * Run a free-form text generation returning the raw response.
   */
  runText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    return this.generator.generateText(prompt, options);
  }
}
