import { Sentiment, Emotion } from '../types';

/**
 * Sentiment Analysis Result
 */
export interface SentimentAnalysisResult {
  sentiment: Sentiment;
  confidence: number; // 0-1
  emotions: EmotionScore[];
}

/**
 * Emotion Score
 */
export interface EmotionScore {
  emotion: Emotion;
  score: number; // 0-1
}

/**
 * Content Analysis Request
 */
export interface ContentAnalysisRequest {
  content: string;
  detectEmotions?: boolean;
  detectKeywords?: boolean;
  detectEntities?: boolean;
}

/**
 * Content Analysis Result
 */
export interface ContentAnalysisResult {
  sentiment: SentimentAnalysisResult;
  keywords: string[];
  entities: string[];
  suggestedImprovements: string[];
  readabilityScore: number;
  estimatedEngagement: number;
}
