
import { parseAIResponse } from '../../infrastructure/utils/jsonParser';
import type { ITextGenerator, TextGenerationOptions } from '../../domain/interfaces/ITextGenerator';

export class GenerationExecutor {
  constructor(private readonly generator: ITextGenerator) {}

  async runJson<T>(prompt: string, fallback: T, generationOptions: TextGenerationOptions = {}): Promise<T> {
    const response = await this.generator.generateText(prompt, generationOptions);
    return parseAIResponse<T>(response, fallback);
  }

  runText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    return this.generator.generateText(prompt, options);
  }
}
