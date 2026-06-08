/**
 * Provider Timing Configuration
 * Centralized defaults for provider HTTP timeouts, retry attempts, and
 * health-check TTL. All providers read from this single source of truth.
 */

export const ProviderTimingConfig = {
  DEFAULT_TIMEOUT_MS: 30_000,
  DEFAULT_RETRY_ATTEMPTS: 3,

  FAL_TIMEOUT_MS: 120_000,
  FAL_RETRY_ATTEMPTS: 2,

  GEMINI_TIMEOUT_MS: 60_000,
  GEMINI_RETRY_ATTEMPTS: 3,

  GROQ_TIMEOUT_MS: 30_000,
  GROQ_RETRY_ATTEMPTS: 3,

  /** Health-check results are cached for this long to avoid re-hitting providers. */
  HEALTH_CHECK_TTL_MS: 5 * 60 * 1000,

  /** Initial backoff delay in ms; doubles with each retry attempt. */
  RETRY_BACKOFF_BASE_MS: 1_000,
} as const;
