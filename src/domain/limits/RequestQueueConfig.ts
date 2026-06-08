/**
 * Request Queue Configuration
 * Centralized defaults for the request queue, retry policy, and
 * rate limiting. Read once by RequestQueue during construction.
 */

export const RequestQueueConfig = {
  MAX_CONCURRENT: 3,
  MAX_QUEUE_SIZE: 50,
  DEFAULT_TIMEOUT_MS: 30_000,
  RETRY_DELAY_MS: 1_000,

  RATE_LIMIT: {
    ENABLED: true,
    WINDOW_MS: 60_000,
    MAX_REQUESTS_PER_WINDOW: 100,
  },

  /** Polling interval the queue uses to check the work loop. */
  POLL_INTERVAL_MS: 100,
} as const;
