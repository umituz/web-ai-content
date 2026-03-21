/**
 * @umituz/web-ai-content
 *
 * AI-powered content generation suite with platform-specific optimization,
 * sentiment analysis, SEO tools, and A/B testing capabilities.
 *
 * @example
 * ```tsx
 * import { useBlogGenerator, useSocialContentGenerator } from '@umituz/web-ai-content';
 *
 * function MyComponent() {
 *   const { generateBlog, isGenerating, generatedBlog } = useBlogGenerator({
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *   });
 *
 *   const handleGenerate = async () => {
 *     await generateBlog({
 *       topic: 'The Future of AI',
 *       blogType: 'tutorial',
 *       targetKeywords: ['AI', 'machine learning', 'future'],
 *       tone: 'professional',
 *       wordCount: 1500,
 *       targetAudience: 'tech enthusiasts',
 *       seoOptimization: true,
 *       includeImages: true,
 *       includeSchema: true,
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleGenerate} disabled={isGenerating}>
 *       {isGenerating ? 'Generating...' : 'Generate Blog Post'}
 *     </button>
 *   );
 * }
 * ```
 */

// Domain Layer
export * from './domain';

// Application Layer
export * from './application';

// Presentation Layer
export * from './presentation';

// Service
export { AIContentService } from './application/services/AIContentService';
