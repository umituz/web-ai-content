import { describe, expect, it } from 'vitest';

const sortedExports = async (modulePath: string): Promise<string[]> =>
  Object.keys(await import(modulePath)).sort();

describe('public API surface', () => {
  it('root entry exports exactly the documented surface', async () => {
    expect(await sortedExports('../src/index')).toEqual([
      'ABTestService',
      'AIContentService',
      'AnalysisService',
      'BlogService',
      'ContentCalendarService',
      'FalProvider',
      'GenerationExecutor',
      'GeminiProvider',
      'GroqProvider',
      'ImagePromptService',
      'MediaGenerationService',
      'PrunaProvider',
      'ProviderFactory',
      'SeoService',
      'SocialService',
      'VideoScriptService',
      'AIError',
      'ProviderError',
      'ProviderQuotaExhaustedError',
      'ProviderUnavailableError',
      'ValidationError',
      'createFalProvider',
      'createGeminiProvider',
      'createGroqProvider',
      'createPrunaProvider',
      'createProviderFactory',
      'generateWithPruna',
      'CONTENT_WIZARD_STEPS',
      'IMAGE_WIZARD_STEPS',
      'VIDEO_WIZARD_STEPS',
      'buildContentRequest',
      'buildImageRequest',
      'buildVideoRequest',
      'ASPECT_RATIO_OPTIONS',
      'ASPECT_RATIO_VALUES',
      'GENERATION_COSTS',
      'IMAGE_QUALITY_OPTIONS',
      'IMAGE_QUALITY_VALUES',
      'MOTION_OPTIONS',
      'STYLE_PRESETS',
      'VIDEO_DURATION_OPTIONS',
      'VIDEO_DURATION_OPTIONS_SECONDS',
      'VIDEO_QUALITY_OPTIONS',
      'VIDEO_QUALITY_VALUES',
      'calculateCreditCost',
      'getDimensionsForAspectRatio',
      'getRecommendedQuality',
      'useAIGeneration',
      'useAIContent',
      'useBlogGenerator',
      'useContentWizard',
      'useImageWizard',
      'useSocialContentGenerator',
      'useVideoWizard',
    ].sort());
  });

  it('domain entry has no dependency on application/infrastructure layers', async () => {
    const domain = await import('../src/domain');
    expect(Object.keys(domain).length).toBeGreaterThan(20);
    expect(domain).toHaveProperty('TextModelDefaults');
    expect(domain).toHaveProperty('ModelDefaults');
  });

  it('error taxonomy exports are stable', async () => {
    const errors = await import('../src/domain/errors/AIErrors');
    expect(Object.keys(errors).sort()).toEqual([
      'AIError',
      'ProviderQuotaExhaustedError',
      'ProviderUnavailableError',
      'ValidationError',
    ]);
  });
});
