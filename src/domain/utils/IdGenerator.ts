/**
 * Id Generator
 * Centralized ID generation using crypto-secure randomness when available,
 * with a deterministic fallback for environments without crypto support.
 */

/**
 * Generate a unique identifier suitable for content results.
 * Uses crypto.randomUUID() when available, falls back to a high-entropy string.
 */
export function generateId(prefix?: string): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

  return prefix ? `${prefix}-${id}` : id;
}
