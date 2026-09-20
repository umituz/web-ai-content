/**
 * Memory Configuration
 * Centralized defaults formerly used by the memory manager, object pool,
 * and expiring cache utilities.
 *
 * @deprecated Those utilities were removed from the infrastructure layer;
 * these constants are retained only so existing `./domain` imports keep
 * resolving. Do not use them in new code.
 */

export const MemoryConfig = {
  MANAGER: {
    /** Hard ceiling for tracked resources in bytes (50 MB). */
    MAX_SIZE_BYTES: 50 * 1024 * 1024,
    /** When total size crosses this fraction of MAX_SIZE, start evicting. */
    CLEANUP_THRESHOLD_RATIO: 0.8,
    /** Target retention ratio after cleanup runs. */
    RETENTION_RATIO: 0.5,
  },
  POOL: {
    DEFAULT_MAX_SIZE: 100,
  },
  EXPIRING_CACHE: {
    DEFAULT_TTL_MS: 60_000,
    CLEANUP_INTERVAL_MS: 60_000,
  },
} as const;
