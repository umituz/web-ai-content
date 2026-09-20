/**
 * Text Generation Options
 * Common shape for controlling model output across text-generation backends.
 */
export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  model?: string;
}

/**
 * TextGenerator Interface
 * Strategy contract: any text generation backend (an LLM client SDK, Groq,
 * a multi-provider factory, or a fully custom implementation) can drive the
 * service layer by implementing this interface.
 */
export interface ITextGenerator {
  generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;
  generateTextStream(prompt: string, options?: TextGenerationOptions): AsyncGenerator<string>;
}
