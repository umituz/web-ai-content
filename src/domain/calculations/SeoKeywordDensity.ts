/**
 * SEO Keyword Density
 * Pure math for computing keyword density and counting matches
 * inside a body of text.
 */

export function countKeywordOccurrences(content: string, keyword: string): number {
  if (!keyword) return 0;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = content.match(new RegExp(escaped, 'gi'));
  return matches ? matches.length : 0;
}

export function countWordsInContent(content: string): number {
  const tokens = content.split(/\s+/).filter(Boolean);
  return tokens.length || 1; // Avoid divide-by-zero; treat empty as "1 word".
}

/**
 * Keyword density expressed as a percentage of total words.
 * Example: keyword appears 3 times in 100 words → 3.
 */
export function calculateKeywordDensity(content: string, keyword: string): number {
  const totalWords = countWordsInContent(content);
  const occurrences = countKeywordOccurrences(content, keyword);
  return (occurrences / totalWords) * 100;
}
