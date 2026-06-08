/**
 * Retry Backoff Delay
 * Pure math for exponential backoff scheduling. Each retry attempt N
 * (0-indexed) waits `base * 2^N` milliseconds.
 */

import { ProviderTimingConfig } from '../limits/ProviderTimingConfig';

export function calculateRetryBackoffDelayMs(attemptIndex: number): number {
  return ProviderTimingConfig.RETRY_BACKOFF_BASE_MS * Math.pow(2, attemptIndex);
}
