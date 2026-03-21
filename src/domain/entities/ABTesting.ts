import { ContentType, ContentTone } from '../types';

/**
 * A/B Test Variant
 */
export interface ABTestVariant {
  id: string;
  name: string;
  content: string;
  contentType: ContentType;
  tone: ContentTone;
}

/**
 * A/B Test Prediction
 */
export interface ABTestPrediction {
  variantId: string;
  predictedEngagement: number; // 0-100
  predictedCTR: number; // 0-100
  predictedConversions: number; // 0-100
  confidence: number; // 0-1
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

/**
 * A/B Test Comparison
 */
export interface ABTestComparison {
  winner: string; // variant ID
  confidence: number; // 0-1
  improvement: string; // e.g., "+15% engagement"
  reasoning: string;
  recommendations: string[];
}

/**
 * A/B Test Request
 */
export interface ABTestRequest {
  variants: ABTestVariant[];
  targetAudience: string;
  platform: string;
  goals: string[];
}
