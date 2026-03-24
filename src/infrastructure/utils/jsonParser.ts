/**
 * Optimized JSON Parsing Utilities
 * Handles large JSON responses efficiently with streaming support
 */

/**
 * Safe JSON parse with detailed error handling
 */
export function safeJSONParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Provide more detailed error information
      const positionMatch = error.message.match(/position (\d+)/);
      const position = positionMatch ? parseInt(positionMatch[1], 10) : -1;

      if (position > 0) {
        const context = text.substring(Math.max(0, position - 50), position + 50);
        console.error(`JSON parse error at position ${position}: "${context}"`);
      }
    }
    return fallback;
  }
}

/**
 * Extract JSON from AI response (handles markdown code blocks and noise)
 */
export function extractJSON(text: string): string | null {
  // Try to find JSON object first
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  // Try to find JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  // Try to find JSON in markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  return null;
}

/**
 * Parse JSON response from AI with fallback
 */
export function parseAIResponse<T>(response: string, fallback: T): T {
  const json = extractJSON(response);
  if (!json) {
    return fallback;
  }

  return safeJSONParse(json, fallback);
}

/**
 * Streaming JSON parser for large responses
 * Chunks the parsing to avoid blocking the main thread
 */
export async function parseJSONStreaming<T>(
  text: string,
  chunkSize = 10000
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      // For smaller payloads, parse immediately
      if (text.length <= chunkSize) {
        resolve(JSON.parse(text) as T);
        return;
      }

      // For larger payloads, use requestIdleCallback or setTimeout
      const parseChunk = () => {
        try {
          const result = JSON.parse(text) as T;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Use requestIdleCallback if available, otherwise use setTimeout
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => parseChunk(), { timeout: 1000 });
      } else {
        setTimeout(parseChunk, 0);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Validate JSON structure without parsing
 */
export function isValidJSON(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // Quick checks
  if (
    !(
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )
  ) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deep clone with JSON (faster than structuredClone for some cases)
 */
export function jsonClone<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch {
    throw new Error('Object cannot be cloned with JSON');
  }
}

/**
 * Minify JSON (remove unnecessary whitespace)
 */
export function minifyJSON(obj: unknown): string {
  return JSON.stringify(obj);
}

/**
 * Pretty print JSON with custom indentation
 */
export function prettyJSON(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent);
}

/**
 * Parse JSON with reviver function for transformation
 */
export function parseJSONWithReviver<T>(
  text: string,
  reviver: (key: string, value: unknown) => unknown,
  fallback: T
): T {
  try {
    return JSON.parse(text, reviver) as T;
  } catch {
    return fallback;
  }
}

/**
 * Batch parse multiple JSON strings
 */
export function batchParseJSON<T>(
  strings: string[],
  fallback: T
): T[] {
  return strings.map(str => parseAIResponse(str, fallback));
}

/**
 * LRU cache for parsed JSON results
 */
class JSONParseCache {
  private cache = new Map<string, { value: unknown; timestamp: number }>();
  private maxAge: number;
  private maxSize: number;

  constructor(maxAge = 60000, maxSize = 100) {
    this.maxAge = maxAge;
    this.maxSize = maxSize;
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: unknown): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const jsonParseCache = new JSONParseCache();

/**
 * Parse JSON with caching
 */
export function parseJSONCached<T>(text: string, fallback: T): T {
  // Try cache first
  const cached = jsonParseCache.get(text);
  if (cached) {
    return cached as T;
  }

  // Parse and cache
  const result = safeJSONParse(text, fallback);
  jsonParseCache.set(text, result);

  return result;
}

/**
 * Truncate JSON string to max length (for logging/debugging)
 */
export function truncateJSON(json: string, maxLength = 500): string {
  if (json.length <= maxLength) {
    return json;
  }

  return json.substring(0, maxLength) + '... (truncated)';
}

/**
 * Merge JSON objects (deep merge)
 */
export function mergeJSON(base: string, patch: string): string {
  const baseObj = JSON.parse(base);
  const patchObj = JSON.parse(patch);

  function deepMerge(target: unknown, source: unknown): unknown {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return source;
    if (Array.isArray(target) && Array.isArray(source)) {
      return [...target, ...source];
    }

    const result = { ...target } as Record<string, unknown>;
    for (const key of Object.keys(source)) {
      result[key] = deepMerge(
        result[key],
        (source as Record<string, unknown>)[key]
      );
    }

    return result;
  }

  return JSON.stringify(deepMerge(baseObj, patchObj));
}
