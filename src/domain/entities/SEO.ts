/**
 * SEO Optimization Request
 */
export interface SEOOptimizationRequest {
  content: string;
  keywords: string[];
  targetPlatform?: string;
  includeSchemaMarkup?: boolean;
  language?: string;
}

/**
 * SEO Optimization Result
 */
export interface SEOOptimizationResult {
  optimized: string;
  score: number; // 0-100
  suggestions: string[];
  addedKeywords: string[];
  removedFillerWords: number;
  readabilityImprovements: string[];
  metaDescription?: string;
  titleSuggestions?: string[];
  schemaMarkup?: string;
}

/**
 * SEO Score Breakdown
 */
export interface SEOScoreBreakdown {
  keywordDensity: number;
  readabilityScore: number;
  titleOptimization: number;
  metaDescription: number;
  headingStructure: number;
  internalLinking: number;
  overall: number;
}

/**
 * Keyword Analysis
 */
export interface KeywordAnalysis {
  keyword: string;
  count: number;
  density: number;
  prominence: 'high' | 'medium' | 'low';
  suggestions: string[];
}
