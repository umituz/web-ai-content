/**
 * Platform Types
 */

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram' | 'threads' | 'tiktok' | 'facebook';

export type ContentTone = 'professional' | 'casual' | 'enthusiastic' | 'humorous' | 'dramatic' | 'educational' | 'inspirational';

export type ContentType = 'blog' | 'video' | 'social' | 'email' | 'advertisement' | 'caption' | 'script';

export type Emotion = 'happy' | 'excited' | 'calm' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type BlogType = 'tutorial' | 'listicle' | 'review' | 'opinion' | 'howto';

/**
 * Platform Specifications
 */
export interface PlatformSpecs {
  maxLength: number;
  style: string;
  emojiSupport: boolean;
  hashtagSupport: boolean;
  imageSupport: boolean;
  videoSupport: boolean;
}

export const PLATFORM_SPECS: Record<SocialPlatform, PlatformSpecs> = {
  twitter: {
    maxLength: 280,
    style: 'concise, engaging, thread-friendly',
    emojiSupport: true,
    hashtagSupport: true,
    imageSupport: true,
    videoSupport: true,
  },
  linkedin: {
    maxLength: 3000,
    style: 'professional, insightful, industry-focused',
    emojiSupport: true,
    hashtagSupport: true,
    imageSupport: true,
    videoSupport: true,
  },
  instagram: {
    maxLength: 2200,
    style: 'visual, engaging, emoji-rich',
    emojiSupport: true,
    hashtagSupport: true,
    imageSupport: true,
    videoSupport: true,
  },
  threads: {
    maxLength: 500,
    style: 'conversational, community-driven',
    emojiSupport: true,
    hashtagSupport: true,
    imageSupport: true,
    videoSupport: true,
  },
  tiktok: {
    maxLength: 150,
    style: 'catchy, trending, short-form',
    emojiSupport: true,
    hashtagSupport: true,
    imageSupport: false,
    videoSupport: true,
  },
  facebook: {
    maxLength: 63206,
    style: 'conversational, engaging, shareable',
    emojiSupport: true,
    hashtagSupport: true,
    imageSupport: true,
    videoSupport: true,
  },
};
