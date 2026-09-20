/**
 * JSON Parsing Utilities
 * Robust extraction and parsing of JSON from LLM responses, which are
 * frequently wrapped in prose or markdown fences.
 */

/**
 * Safe JSON parse with detailed error context.
 * Returns the parsed value on success or `fallback` on failure.
 * Diagnostics are delegated to the optional `onError` callback so the
 * caller can decide how (or whether) to surface them.
 */
export function safeJSONParse<T>(text: string, fallback: T, onError?: (context: string) => void): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      const positionMatch = error.message.match(/position (\d+)/);
      const position = positionMatch ? parseInt(positionMatch[1], 10) : -1;
      if (position > 0) {
        const context = text.substring(Math.max(0, position - 50), position + 50);
        onError?.(`JSON parse error at position ${position}: "${context}"`);
      } else {
        onError?.(`JSON parse error: ${error.message}`);
      }
    }
    return fallback;
  }
}

/**
 * Extract a JSON payload from an AI response.
 *
 * Order matters: fenced code blocks are tried first because they carry an
 * explicit boundary — a greedy brace match would otherwise swallow prose
 * containing braces, and fences would almost never win.
 */
export function extractJSON(text: string): string | null {
  // Exact fenced block (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      return candidate;
    }
  }

  // Bare JSON object or array embedded in prose. Prefer the outermost
  // balanced-looking span; JSON.parse in safeJSONParse rejects bad spans.
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return null;
}

/**
 * Parse a JSON response from an AI with a fallback value.
 * Parse failures are reported through the optional `onError` callback;
 * by default they stay silent so callers keep their fallback semantics.
 */
export function parseAIResponse<T>(response: string, fallback: T, onError?: (context: string) => void): T {
  const json = extractJSON(response);
  if (!json) {
    onError?.('No JSON payload found in response');
    return fallback;
  }

  return safeJSONParse(json, fallback, onError);
}

/**
 * Validate JSON structure without returning the parsed value.
 */
export function isValidJSON(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

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
