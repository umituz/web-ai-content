/**
 * Memory Configuration
 * Centralized defaults for the memory manager, object pool, and expiring
 * cache. Lets the consumer tune ceilings without reading source.
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
