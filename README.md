# @umituz/web-ai-content

> AI-powered content generation suite with platform-specific optimization, sentiment analysis, SEO tools, and A/B testing capabilities.

## Features

### ✅ Content Generation
- **Blog Generator** - SEO-optimized blog posts with schema markup
- **Social Media Content** - Platform-specific posts (Twitter, LinkedIn, Instagram, Threads, TikTok)
- **Video Scripts** - Engaging scripts with visual cues and CTAs
- **Content Calendar** - Automated content scheduling
- **Voice Content** - Emotion-controlled script generation

### ✅ Analysis & Optimization
- **Sentiment Analysis** - Detect emotions and sentiment (7 emotions)
- **SEO Optimizer** - Advanced SEO scoring and optimization
- **Keyword Analysis** - Density, prominence, and suggestions
- **A/B Testing Predictor** - Predict engagement and compare variants

### ✅ Additional Tools
- **Hashtag Generator** - Smart hashtag suggestions
- **Image Prompt Generator** - AI image prompts for Midjourney/DALL-E
- **Multi-Platform Generator** - Generate content for all platforms at once

## Installation

```bash
npm install @umituz/web-ai-content
# or
yarn add @umituz/web-ai-content
# or
pnpm add @umituz/web-ai-content
```

## Quick Start

### 1. Set up API Key

Get your API key from [Anthropic Console](https://console.anthropic.com/)

```bash
# .env.local
ANTHROPIC_API_KEY=your_api_key_here
```

### 2. Use the Hook

```tsx
import { useBlogGenerator } from '@umituz/web-ai-content';

function BlogGenerator() {
  const { generateBlog, isGenerating, generatedBlog, error } = useBlogGenerator({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const handleGenerate = async () => {
    await generateBlog({
      topic: 'The Future of AI in 2025',
      blogType: 'tutorial',
      targetKeywords: ['AI', 'machine learning', 'future technology'],
      tone: 'professional',
      wordCount: 1500,
      targetAudience: 'tech enthusiasts and developers',
      seoOptimization: true,
      includeImages: true,
      includeSchema: true,
      language: 'English',
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Blog Post'}
      </button>

      {error && <div className="error">{error}</div>}

      {generatedBlog && (
        <article>
          <h1>{generatedBlog.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: generatedBlog.content }} />
          <div>SEO Score: {generatedBlog.seoScore}/100</div>
        </article>
      )}
    </div>
  );
}
```

## Hooks

### `useAIContent`

Main hook that provides access to all AI content generation features.

```tsx
import { useAIContent } from '@umituz/web-ai-content';

const { generateSocialContent, analyzeSentiment, optimizeSEO } = useAIContent({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Generate social media post
await generateSocialContent({
  topic: 'New product launch',
  platform: 'twitter',
  tone: 'enthusiastic',
  hashtags: true,
});

// Analyze sentiment
await analyzeSentiment('This product is amazing!');

// Optimize for SEO
await optimizeSEO({
  content: 'Your content here',
  keywords: ['keyword1', 'keyword2'],
});
```

### `useBlogGenerator`

Specialized hook for blog post generation.

```tsx
import { useBlogGenerator } from '@umituz/web-ai-content';

const { generateBlog, isGenerating, generatedBlog } = useBlogGenerator({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```

### `useSocialContentGenerator`

Specialized hook for social media content generation.

```tsx
import { useSocialContentGenerator } from '@umituz/web-ai-content';

const { generateForAllPlatforms, generatedContents } = useSocialContentGenerator({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Generate for all platforms
await generateForAllPlatforms('New feature announcement', 'professional');
```

## API Reference

### Blog Generation

```typescript
interface BlogGenerationRequest {
  topic: string;
  blogType: 'tutorial' | 'listicle' | 'review' | 'opinion' | 'howto';
  targetKeywords: string[];
  tone: 'professional' | 'casual' | 'enthusiastic' | 'humorous' | 'dramatic' | 'educational';
  wordCount: number;
  targetAudience: string;
  seoOptimization: boolean;
  includeImages: boolean;
  includeSchema: boolean;
  language?: string;
}
```

### Social Media Generation

```typescript
interface SocialContentRequest {
  topic: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'threads' | 'tiktok' | 'facebook';
  tone: 'professional' | 'casual' | 'enthusiastic' | 'humorous' | 'dramatic' | 'educational';
  hashtags?: boolean;
  maxLength?: number;
  targetAudience?: string;
  includeCallToAction?: boolean;
}
```

### Sentiment Analysis

```typescript
interface SentimentAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-1
  emotions: Array<{
    emotion: 'happy' | 'excited' | 'calm' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted';
    score: number; // 0-1
  }>;
}
```

### SEO Optimization

```typescript
interface SEOOptimizationResult {
  optimized: string;
  score: number; // 0-100
  suggestions: string[];
  addedKeywords: string[];
  removedFillerWords: number;
  readabilityImprovements: string[];
  metaDescription?: string;
  titleSuggestions?: string[];
}
```

## Platform Specifications

Each platform has optimized specifications:

| Platform | Max Length | Style |
|----------|-----------|-------|
| Twitter | 280 | Concise, thread-friendly |
| LinkedIn | 3000 | Professional, insightful |
| Instagram | 2200 | Visual, emoji-rich |
| Threads | 500 | Conversational |
| TikTok | 150 | Catchy, trending |
| Facebook | 63206 | Conversational, shareable |

## Examples

### Generate Content Calendar

```tsx
const calendar = await generateContentCalendar('tech startup', 30);
// Returns 30 days of content ideas with platforms and engagement predictions
```

### A/B Testing Prediction

```tsx
const predictions = await predictABTest({
  variants: [
    { id: '1', content: 'Variant A', contentType: 'social', tone: 'casual' },
    { id: '2', content: 'Variant B', contentType: 'social', tone: 'professional' },
  ],
  targetAudience: 'millennials',
  platform: 'twitter',
  goals: ['engagement', 'clicks'],
});
```

### Voice Script with Emotion

```tsx
const script = await generateVoiceScript(
  'Product announcement',
  'excited',
  30 // 30 seconds
);
```

## Architecture

This package follows Domain-Driven Design (DDD) principles:

```
src/
├── domain/           # Types, interfaces, entities
├── application/      # Services, business logic
├── infrastructure/   # External integrations
└── presentation/     # React hooks, UI utilities
```

## License

MIT © umituz

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/umituz/web-ai-content).
