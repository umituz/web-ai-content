/**
 * Pruna Generation Functions
 * Re-exports from @umituz/pruna-provider
 */

// Re-export all generation functions from @umituz/pruna-provider/core
// This is done at runtime to avoid build-time type checking issues
export async function* generateWithPruna(
  request: any,
  apiKey: string,
  signal?: AbortSignal,
  onProgress?: (stage: any, attempt?: number) => void,
): AsyncGenerator<any> {
  // Lazy import at runtime
  // @ts-ignore - @umituz/pruna-provider is a peer dependency
  const prunaCore = await import('@umituz/pruna-provider/core');

  // Check if generateWithPruna exists in pruna-core, if not use direct API calls
  if ('generateWithPruna' in prunaCore) {
    yield* prunaCore.generateWithPruna(request, apiKey, signal, onProgress);
  } else if ('submitPrediction' in prunaCore && 'pollForResult' in prunaCore) {
    // Use submitPrediction and pollForResult directly
    const modelId = request.model || (request.image ? 'p-image-edit' : 'p-image');

    const prediction = await prunaCore.submitPrediction(
      modelId,
      request,
      apiKey,
      signal,
      onProgress,
    );

    if (prediction.output && typeof prediction.output === 'object' && 'url' in prediction.output) {
      yield {
        stage: 'predicting',
        result: {
          url: prediction.output.url as string,
          model: modelId,
        },
      };
      return;
    }

    if (prediction.status_url || prediction.generation_url) {
      const pollUrl = prediction.status_url || prediction.generation_url;
      const resultUrl = await prunaCore.pollForResult(
        pollUrl!,
        apiKey,
        60,
        2000,
        signal,
        onProgress,
      );

      yield {
        stage: 'polling',
        result: {
          url: resultUrl,
          model: modelId,
        },
      };
    }
  } else {
    throw new Error('@umituz/pruna-provider/core does not export required functions');
  }
}
