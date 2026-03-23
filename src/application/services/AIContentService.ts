import Anthropic from '@anthropic-ai/sdk';
import {
  IAIContentService,
  IAIProvider,
  TextGenerationOptions,
} from '../../domain/interfaces/IAIContentService';
import {
  BlogGenerationRequest,
  GeneratedBlog,
  SocialContentRequest,
  GeneratedSocialContent,
  VideoScriptRequest,
  GeneratedVideoScript,
  ContentCalendarEntry,
} from '../../domain/entities/ContentGeneration';
import {
  ContentAnalysisRequest,
  ContentAnalysisResult,
  SentimentAnalysisResult,
} from '../../domain/entities/SentimentAnalysis';
import {
  SEOOptimizationRequest,
  SEOOptimizationResult,
  SEOScoreBreakdown,
  KeywordAnalysis,
} from '../../domain/entities/SEO';
import {
  ABTestRequest,
  ABTestPrediction,
  ABTestComparison,
} from '../../domain/entities/ABTesting';
import { SocialPlatform, ContentTone, Emotion, ContentType, PLATFORM_SPECS } from '../../domain/types';

/**
 * Constants for content generation calculations
 */
const WORDS_PER_SECOND = 2.5;
const TOKENS_PER_SECOND = 10;
const MAX_CONTENT_PREVIEW_LENGTH = 500;
const MAX_VARIANT_CONTENT_LENGTH = 200;
const MAX_BLOG_CONTENT_PREVIEW_LENGTH = 1000;

/**
 * Validation limits for user inputs
 */
const MAX_TOPIC_LENGTH = 500;
const MAX_CONTENT_LENGTH = 10000;
const MAX_KEYWORDS_COUNT = 20;
const MAX_KEYWORD_LENGTH = 50;
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 600;
const MIN_DAYS = 1;
const MAX_DAYS = 90;

/**
 * Escapes special regex characters in a string to prevent ReDoS attacks
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses JSON from AI response with fallback to default value
 */
function parseJSONResponse<T>(response: string, fallback: T): T {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
  } catch (error) {
    // Return fallback on parse error
  }
  return fallback;
}

/**
 * Validates and trims topic input
 */
function validateTopic(topic: string): string {
  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic cannot be empty');
  }
  const trimmed = topic.trim();
  if (trimmed.length > MAX_TOPIC_LENGTH) {
    throw new Error(`Topic exceeds maximum length of ${MAX_TOPIC_LENGTH} characters`);
  }
  return trimmed;
}

/**
 * Validates and trims content input
 */
function validateContent(content: string): string {
  if (!content || content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }
  const trimmed = content.trim();
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
  }
  return trimmed;
}

/**
 * Validates keywords array
 */
function validateKeywords(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) {
    throw new Error('Keywords must be an array');
  }
  if (keywords.length > MAX_KEYWORDS_COUNT) {
    throw new Error(`Cannot process more than ${MAX_KEYWORDS_COUNT} keywords`);
  }
  return keywords
    .filter(k => k && k.trim().length > 0)
    .map(k => {
      const trimmed = k.trim();
      if (trimmed.length > MAX_KEYWORD_LENGTH) {
        throw new Error(`Keyword "${trimmed.substring(0, 20)}..." exceeds maximum length of ${MAX_KEYWORD_LENGTH} characters`);
      }
      return trimmed;
    });
}

/**
 * Validates duration in seconds
 */
function validateDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
    throw new Error(`Duration must be between ${MIN_DURATION_SECONDS} and ${MAX_DURATION_SECONDS} seconds`);
  }
  return duration;
}

/**
 * Validates days count
 */
function validateDays(days: number): number {
  if (!Number.isFinite(days) || days < MIN_DAYS || days > MAX_DAYS) {
    throw new Error(`Days must be between ${MIN_DAYS} and ${MAX_DAYS}`);
  }
  return days;
}

/**
 * Validates hashtag count
 */
function validateHashtagCount(count: number): number {
  if (!Number.isFinite(count) || count < 1 || count > 50) {
    throw new Error('Hashtag count must be between 1 and 50');
  }
  return Math.floor(count);
}

/**
 * Validates and clamps a score to 0-100 range
 */
function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 50; // Default on invalid
  return Math.max(0, Math.min(100, score));
}

/**
 * Validates and clamps a confidence value to 0-1 range
 */
function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0.5; // Default on invalid
  return Math.max(0, Math.min(1, confidence));
}

/**
 * AI Content Service Implementation
 * Uses Anthropic Claude API for content generation
 */
export class AIContentService implements IAIContentService {
  private anthropic: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.anthropic = new Anthropic({ apiKey });
    this.model = model;
  }

  private async generateText(
    prompt: string,
    options: TextGenerationOptions = {}
  ): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: options.model || this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0];
    if (text.type === 'text') {
      return text.text;
    }
    throw new Error('Unexpected response type from Anthropic API');
  }

  /**
   * Generate Blog Post
   */
  async generateBlogPost(request: BlogGenerationRequest): Promise<GeneratedBlog> {
    // Validate inputs
    const validatedTopic = validateTopic(request.topic);
    const validatedKeywords = validateKeywords(request.targetKeywords);

    const prompt = `
As an expert SEO Content Strategist and Copywriter, generate a high-quality, comprehensive blog post.

TOPIC: ${validatedTopic}
TYPE: ${request.blogType}
KEYWORDS: ${validatedKeywords.join(', ')}
TONE: ${request.tone}
TARGET AUDIENCE: ${request.targetAudience}
WORD COUNT: ${request.wordCount}
LANGUAGE: ${request.language || 'English'}

OPTIMIZATION REQUIREMENTS:
- SEO Optimization: ${request.seoOptimization ? 'ON (Include semantic keywords, LSI, and proper H1-H3 structure)' : 'OFF'}
- Include Schema Markup: ${request.includeSchema ? 'ON (Generate JSON-LD for this blog type)' : 'OFF'}
- Image Suggestions: ${request.includeImages ? 'ON (Provide DALL-E/Midjourney style prompts for contextually relevant images)' : 'OFF'}

RESPONSE FORMAT (STRICT JSON ONLY):
{
  "title": "Compelling, Click-worthy Title",
  "content": "Full markdown-formatted blog content with headers",
  "metaDescription": "SEO-optimized description (150-160 chars)",
  "seoScore": 0-100,
  "readabilityScore": 0-100,
  "keywords": ["list", "of", "optimized", "keywords"],
  "performance": {
    "readingTime": minutes (number),
    "shareability": 0-10 (number),
    "seoRank": 0-10 (number)
  },
  "schemaMarkup": "JSON-LD string (if requested)",
  "imagePrompts": ["Prompt 1", "Prompt 2"] (if requested)
}
`;

    const response = await this.generateText(prompt, {
      maxTokens: request.wordCount * 2,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(response);
      return {
        id: Math.random().toString(36).substring(2, 11),
        ...parsed,
        blogType: request.blogType,
        tone: request.tone,
        wordCount: request.wordCount,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Generate Social Media Content
   */
  async generateSocialContent(request: SocialContentRequest): Promise<GeneratedSocialContent> {
    // Validate inputs
    const validatedTopic = validateTopic(request.topic);

    const spec = PLATFORM_SPECS[request.platform];
    const length = request.maxLength || spec.maxLength;

    const prompt = `
Write a ${request.tone} social media post about: ${validatedTopic}

Platform: ${request.platform}
Style: ${spec.style}
Maximum length: ${length} characters
${request.hashtags !== false ? 'Include relevant hashtags' : 'No hashtags'}
${request.includeCallToAction ? 'Include a call-to-action' : ''}

Requirements:
- Platform-optimized formatting
- Engaging hook in first sentence
- Natural, conversational tone
- Platform-appropriate emoji usage

Generate the post in JSON format:
{
  "content": "The post content",
  "hashtags": ["hashtag1", "hashtag2"],
  "emojis": ["emoji1", "emoji2"],
  "estimatedEngagement": 0-100
}
`;

    const response = await this.generateText(prompt, {
      maxTokens: 500,
      temperature: 0.8,
    });

    try {
      const parsed = JSON.parse(response);
      return {
        ...parsed,
        platform: request.platform,
        characterCount: parsed.content.length,
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Generate Video Script
   */
  async generateVideoScript(request: VideoScriptRequest): Promise<GeneratedVideoScript> {
    // Validate inputs
    const validatedTopic = validateTopic(request.topic);
    const validatedDuration = validateDuration(request.duration);

    const prompt = `
Create a ${request.tone} video script about: ${validatedTopic}

Duration: ${validatedDuration} seconds
Target Audience: ${request.targetAudience}
Include Visual Cues: ${request.includeVisuals ? 'Yes' : 'No'}
Include CTA: ${request.includeCallToAction ? 'Yes' : 'No'}

Approximate word count: ${Math.floor(validatedDuration * WORDS_PER_SECOND)} words

Generate in JSON format:
{
  "script": "Full script with dialogue and narration",
  "visualCues": ["Visual cue 1", "Visual cue 2"],
  "callToAction": "Call to action text (if requested)",
  "estimatedEngagement": 0-100
}
`;

    const response = await this.generateText(prompt, {
      maxTokens: validatedDuration * TOKENS_PER_SECOND,
      temperature: 0.8,
    });

    try {
      const parsed = JSON.parse(response);
      if (!parsed.script) {
        throw new Error('AI response missing script field');
      }
      return {
        ...parsed,
        duration: validatedDuration,
        wordCount: parsed.script.split(' ').length,
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Generate for All Platforms
   */
  async generateForAllPlatforms(
    topic: string,
    tone: ContentTone
  ): Promise<GeneratedSocialContent[]> {
    const platforms: SocialPlatform[] = ['twitter', 'linkedin', 'instagram', 'threads', 'tiktok'];

    const promises = platforms.map(platform =>
      this.generateSocialContent({ topic, platform, tone })
    );

    return Promise.all(promises);
  }

  /**
   * Generate Content Calendar
   */
  async generateContentCalendar(niche: string, days: number): Promise<ContentCalendarEntry[]> {
    // Validate inputs
    const validatedNiche = validateTopic(niche);
    const validatedDays = validateDays(days);

    interface CalendarItem {
      day: number;
      topic: string;
      contentType: ContentType;
      platform: SocialPlatform;
      description: string;
      estimatedEngagement: number;
      priority: 'high' | 'medium' | 'low';
    }
    const prompt = `
Generate a ${validatedDays}-day content calendar for: ${validatedNiche}

For each day, provide:
- Topic
- Content type (blog, video, social, email, caption, script)
- Best platform for this content
- Brief description
- Estimated engagement (0-100)
- Priority level (high, medium, low)

Format as JSON array:
[
  {
    "day": 1,
    "topic": "...",
    "contentType": "blog|video|social|email|caption|script",
    "platform": "twitter|linkedin|instagram|threads|tiktok|facebook",
    "description": "...",
    "estimatedEngagement": 0-100,
    "priority": "high|medium|low"
  }
]

Requirements:
- Mix of content types across platforms
- Platform-appropriate suggestions
- Engaging, varied topics
- Realistic posting schedule
`;

    const response = await this.generateText(prompt, {
      maxTokens: validatedDays * 100,
      temperature: 0.8,
    });

    try {
      const data = JSON.parse(response) as CalendarItem[];
      return data.map((item) => ({
        date: new Date(Date.now() + (item.day - 1) * 24 * 60 * 60 * 1000),
        topic: item.topic,
        contentType: item.contentType,
        platform: item.platform,
        description: item.description,
        estimatedEngagement: item.estimatedEngagement,
        priority: item.priority,
      }));
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Analyze Sentiment
   */
  async analyzeSentiment(content: string): Promise<SentimentAnalysisResult> {
    // Validate inputs
    const validatedContent = validateContent(content);

    const prompt = `
Analyze the sentiment of this social media post:

"${validatedContent}"

Provide analysis in JSON format:
{
  "sentiment": "positive|neutral|negative",
  "confidence": 0-1,
  "emotions": [
    {"emotion": "happy|excited|calm|sad|angry|surprised|fearful|disgusted|neutral", "score": 0-1}
  ]
}

Return only the JSON:
`;

    const response = await this.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.3,
    });

    const result = parseJSONResponse<SentimentAnalysisResult>(response, {
      sentiment: 'neutral',
      confidence: 0.5,
      emotions: [],
    });

    // Validate confidence is in 0-1 range
    result.confidence = clampConfidence(result.confidence);

    return result;
  }

  /**
   * Analyze Content
   */
  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    // Validate inputs
    const validatedContent = validateContent(request.content);

    const sentimentResult = await this.analyzeSentiment(validatedContent);

    const prompt = `
Analyze this content:

"${validatedContent}"

Provide analysis in JSON format:
{
  "keywords": ["keyword1", "keyword2", ...],
  "entities": ["entity1", "entity2", ...],
  "suggestedImprovements": ["suggestion1", ...],
  "readabilityScore": 0-100,
  "estimatedEngagement": 0-100
}

Return only the JSON:
`;

    const response = await this.generateText(prompt, {
      maxTokens: 300,
      temperature: 0.5,
    });

    const parsed = parseJSONResponse(response, {
      keywords: [] as string[],
      entities: [] as string[],
      suggestedImprovements: [] as string[],
      readabilityScore: 50,
      estimatedEngagement: 50,
    });

    // Validate score ranges
    parsed.readabilityScore = clampScore(parsed.readabilityScore);
    parsed.estimatedEngagement = clampScore(parsed.estimatedEngagement);

    return {
      sentiment: sentimentResult,
      keywords: parsed.keywords,
      entities: parsed.entities,
      suggestedImprovements: parsed.suggestedImprovements,
      readabilityScore: parsed.readabilityScore,
      estimatedEngagement: parsed.estimatedEngagement,
    };
  }

  /**
   * Optimize SEO
   */
  async optimizeSEO(request: SEOOptimizationRequest): Promise<SEOOptimizationResult> {
    // Validate inputs
    const validatedContent = validateContent(request.content);
    const validatedKeywords = validateKeywords(request.keywords);

    const prompt = `
Optimize this content for SEO:

Content: "${validatedContent}"
Keywords: ${validatedKeywords.join(', ')}

Tasks:
1. Incorporate keywords naturally
2. Improve engagement potential
3. Add relevant call-to-action if appropriate
4. Optimize for readability
5. Enhance heading structure

Return JSON:
{
  "optimized": "...",
  "score": 0-100,
  "suggestions": ["suggestion1", ...],
  "addedKeywords": ["keyword1", ...],
  "removedFillerWords": number,
  "readabilityImprovements": ["improvement1", ...],
  "metaDescription": "SEO-optimized meta description",
  "titleSuggestions": ["title1", ...]
}

Return only the JSON:
`;

    const response = await this.generateText(prompt, {
      maxTokens: 1000,
      temperature: 0.7,
    });

    const result = parseJSONResponse(response, {
      optimized: validatedContent,
      score: 50,
      suggestions: [],
      addedKeywords: [],
      removedFillerWords: 0,
      readabilityImprovements: [],
    });

    // Validate score is in 0-100 range
    result.score = clampScore(result.score);

    return result;
  }

  /**
   * Calculate SEO Score
   */
  async calculateSEOScore(content: string, keywords: string[]): Promise<SEOScoreBreakdown> {
    // Validate inputs
    const validatedContent = validateContent(content);
    const validatedKeywords = validateKeywords(keywords);

    const prompt = `
Calculate SEO score for this content:

Content: "${validatedContent.substring(0, MAX_CONTENT_PREVIEW_LENGTH)}..."
Keywords: ${validatedKeywords.join(', ')}

Provide breakdown in JSON:
{
  "keywordDensity": 0-100,
  "readabilityScore": 0-100,
  "titleOptimization": 0-100,
  "metaDescription": 0-100,
  "headingStructure": 0-100,
  "internalLinking": 0-100,
  "overall": 0-100
}

Return only the JSON:
`;

    const response = await this.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.3,
    });

    const result = parseJSONResponse(response, {
      keywordDensity: 50,
      readabilityScore: 50,
      titleOptimization: 50,
      metaDescription: 50,
      headingStructure: 50,
      internalLinking: 50,
      overall: 50,
    });

    // Validate all scores are in 0-100 range
    result.keywordDensity = clampScore(result.keywordDensity);
    result.readabilityScore = clampScore(result.readabilityScore);
    result.titleOptimization = clampScore(result.titleOptimization);
    result.metaDescription = clampScore(result.metaDescription);
    result.headingStructure = clampScore(result.headingStructure);
    result.internalLinking = clampScore(result.internalLinking);
    result.overall = clampScore(result.overall);

    return result;
  }

  /**
   * Analyze Keywords
   */
  async analyzeKeywords(content: string, keywords: string[]): Promise<KeywordAnalysis[]> {
    // Validate inputs
    const validatedContent = validateContent(content);
    const validatedKeywords = validateKeywords(keywords);

    const results: KeywordAnalysis[] = [];
    const words = validatedContent.split(/\s+/).length;

    for (const keyword of validatedKeywords) {
      const regex = new RegExp(escapeRegExp(keyword), 'gi');
      const matches = validatedContent.match(regex) || [];
      const count = matches.length;
      const density = (count / words) * 100;

      results.push({
        keyword,
        count,
        density,
        prominence: density > 2 ? 'high' : density > 1 ? 'medium' : 'low',
        suggestions: density < 1 ? ['Consider using this keyword more frequently'] : [],
      });
    }

    return results;
  }

  /**
   * Predict A/B Test
   */
  async predictABTest(request: ABTestRequest): Promise<ABTestPrediction[]> {
    const predictions: ABTestPrediction[] = [];

    for (const variant of request.variants) {
      const prompt = `
Predict performance for this content variant:

Content: "${variant.content.substring(0, MAX_VARIANT_CONTENT_LENGTH)}"
Content Type: ${variant.contentType}
Tone: ${variant.tone}
Target Audience: ${request.targetAudience}
Platform: ${request.platform}
Goals: ${request.goals.join(', ')}

Provide prediction in JSON:
{
  "predictedEngagement": 0-100,
  "predictedCTR": 0-100,
  "predictedConversions": 0-100,
  "confidence": 0-1,
  "reasoning": "...",
  "strengths": ["strength1", ...],
  "weaknesses": ["weakness1", ...],
  "suggestions": ["suggestion1", ...]
}

Return only the JSON:
`;

      const response = await this.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.5,
      });

      const parsed = parseJSONResponse(response, {
        predictedEngagement: 0,
        predictedCTR: 0,
        predictedConversions: 0,
        confidence: 0,
        reasoning: '',
        strengths: [],
        weaknesses: [],
        suggestions: [],
      });

      // Validate score ranges
      parsed.predictedEngagement = clampScore(parsed.predictedEngagement);
      parsed.predictedCTR = clampScore(parsed.predictedCTR);
      parsed.predictedConversions = clampScore(parsed.predictedConversions);
      parsed.confidence = clampConfidence(parsed.confidence);

      predictions.push({
        variantId: variant.id,
        ...parsed,
      });
    }

    return predictions;
  }

  /**
   * Compare Variants
   */
  async compareVariants(variantA: string, variantB: string): Promise<ABTestComparison> {
    const predictions = await this.predictABTest({
      variants: [
        { id: 'A', content: variantA, contentType: 'social', tone: 'casual' },
        { id: 'B', content: variantB, contentType: 'social', tone: 'casual' },
      ],
      targetAudience: 'general',
      platform: 'twitter',
      goals: ['engagement', 'clicks'],
    });

    const scoreA = predictions[0]?.predictedEngagement || 50;
    const scoreB = predictions[1]?.predictedEngagement || 50;
    const winner = scoreA > scoreB ? 'A' : 'B';
    const minScore = Math.min(scoreA, scoreB);
    const improvement = minScore > 0
      ? Math.abs((Math.max(scoreA, scoreB) / minScore - 1) * 100).toFixed(0)
      : '100';

    return {
      winner,
      confidence: 0.7,
      improvement: `+${improvement}% engagement`,
      reasoning: winner === 'A' ? 'Variant A has more engaging content' : 'Variant B has more engaging content',
      recommendations: ['Test with larger audience', 'Monitor click-through rates'],
    };
  }

  /**
   * Generate Hashtags
   */
  async generateHashtags(content: string, count: number): Promise<string[]> {
    // Validate inputs
    const validatedContent = validateContent(content);
    const validatedCount = validateHashtagCount(count);

    const prompt = `
Generate ${validatedCount} relevant hashtags for this content:

"${validatedContent}"

Requirements:
- Mix of popular and niche hashtags
- Industry-specific when possible
- Trending if relevant
- No duplicated words
- Format: #hashtag (one per line)

Return only the hashtags:
`;

    const response = await this.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.7,
    });

    const hashtags = response.match(/#[\w-]+/g) || [];
    return hashtags.slice(0, validatedCount);
  }

  /**
   * Optimize Hashtags
   */
  async optimizeHashtags(hashtags: string[], platform: SocialPlatform): Promise<string[]> {
    const maxHashtags = PLATFORM_SPECS[platform].maxHashtags;

    if (hashtags.length <= maxHashtags) {
      return hashtags;
    }

    // Simple strategy: keep hashtags that are more specific (longer)
    return hashtags
      .sort((a, b) => b.length - a.length)
      .slice(0, maxHashtags);
  }

  /**
   * Generate Image Prompt
   */
  async generateImagePrompt(description: string, style: string): Promise<string> {
    // Validate inputs
    const validatedDescription = validateTopic(description);

    const prompt = `
Generate a detailed AI image generation prompt for:

Description: ${validatedDescription}
Style: ${style || 'realistic'}

Create a detailed, descriptive prompt that includes:
- Subject details
- Mood and atmosphere
- Lighting
- Composition
- Art style reference
- Technical specifications (aspect ratio, quality)

The prompt should be optimized for models like Midjourney, DALL-E, or Stable Diffusion.

Generate the prompt:
`;

    return this.generateText(prompt, {
      maxTokens: 300,
      temperature: 0.8,
    });
  }

  /**
   * Generate Image Prompts for Blog
   */
  async generateImagePromptsForBlog(blogContent: string): Promise<string[]> {
    // Validate inputs
    const validatedContent = validateContent(blogContent);

    const prompt = `
Analyze this blog content and generate 3-5 detailed image prompts for illustrative images:

Blog Content: "${validatedContent.substring(0, MAX_BLOG_CONTENT_PREVIEW_LENGTH)}..."

For each image prompt, provide:
- Subject description
- Mood and atmosphere
- Style reference
- Composition details
- Technical specs

Return as JSON array:
["prompt1", "prompt2", "prompt3", ...]

Return only the JSON:
`;

    const response = await this.generateText(prompt, {
      maxTokens: 500,
      temperature: 0.8,
    });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (error) {
        // Return empty array on parse error
      }
    }

    return [];
  }

  /**
   * Generate Voice Script with Emotion
   */
  async generateVoiceScript(
    topic: string,
    emotion: Emotion,
    duration: number
  ): Promise<GeneratedVideoScript> {
    // Validate inputs
    const validatedTopic = validateTopic(topic);
    const validatedDuration = validateDuration(duration);

    const prompt = `
Create a ${emotion} voice script about: ${validatedTopic}

Duration: ${validatedDuration} seconds
Emotion: ${emotion}

The script should:
- Evoke the specified emotion
- Be suitable for voice recording with emotion control
- Include natural speech patterns
- Have appropriate pacing for the emotion
- Include emotional cues in brackets where needed

Approximate word count: ${Math.floor(validatedDuration * WORDS_PER_SECOND)} words

Generate in JSON format:
{
  "script": "Full script with emotional cues",
  "visualCues": ["Visual cue 1", "Visual cue 2"],
  "estimatedEngagement": 0-100
}
`;

    const response = await this.generateText(prompt, {
      maxTokens: validatedDuration * TOKENS_PER_SECOND,
      temperature: 0.8,
    });

    try {
      const parsed = JSON.parse(response);
      if (!parsed.script) {
        throw new Error('AI response missing script field');
      }
      return {
        ...parsed,
        duration: validatedDuration,
        wordCount: parsed.script.split(' ').length,
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }
}
