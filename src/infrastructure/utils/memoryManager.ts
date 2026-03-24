/**
 * Memory Management Utilities
 * Helps prevent memory leaks and optimize garbage collection
 */

/**
 * Cleanup callback type
 */
type CleanupCallback = () => void;

/**
 * Memory manager for tracking and cleaning up resources
 */
export class MemoryManager {
  private resources = new Map<string, {
    resource: unknown;
    cleanup?: CleanupCallback;
    size?: number;
  }>();
  private totalSize = 0;
  private maxSize: number;
  private cleanupThreshold: number;

  constructor(maxSize = 50 * 1024 * 1024, cleanupThreshold = 0.8) {
    this.maxSize = maxSize;
    this.cleanupThreshold = cleanupThreshold;
  }

  /**
   * Register a resource for tracking
   */
  register(
    id: string,
    resource: unknown,
    cleanup?: CleanupCallback,
    size?: number
  ): void {
    // Check if we need to clean up before adding
    if (size && this.totalSize + size > this.maxSize * this.cleanupThreshold) {
      this.cleanup();
    }

    const existing = this.resources.get(id);
    if (existing) {
      // Cleanup existing resource first
      if (existing.cleanup) {
        try {
          existing.cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
      this.totalSize -= existing.size || 0;
    }

    this.resources.set(id, { resource, cleanup, size });
    this.totalSize += size || 0;
  }

  /**
   * Unregister and cleanup a resource
   */
  unregister(id: string): void {
    const entry = this.resources.get(id);
    if (entry) {
      if (entry.cleanup) {
        try {
          entry.cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
      this.totalSize -= entry.size || 0;
      this.resources.delete(id);
    }
  }

  /**
   * Get a resource
   */
  get<T>(id: string): T | undefined {
    return this.resources.get(id)?.resource as T;
  }

  /**
   * Clean up least recently used resources
   */
  private cleanup(): void {
    const entries = Array.from(this.resources.entries());

    // Sort by size (largest first) to free up most memory
    entries.sort((a, b) => (b[1].size || 0) - (a[1].size || 0));

    // Remove resources until we're below threshold
    let freed = 0;
    const targetSize = this.maxSize * this.cleanupThreshold * 0.5;

    for (const [id, entry] of entries) {
      if (this.totalSize - freed <= targetSize) break;

      if (entry.cleanup) {
        try {
          entry.cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }

      freed += entry.size || 0;
      this.resources.delete(id);
    }

    this.totalSize -= freed;
  }

  /**
   * Clear all resources
   */
  clear(): void {
    for (const [id] of this.resources) {
      this.unregister(id);
    }
  }

  /**
   * Get memory usage statistics
   */
  getStats(): {
    totalSize: number;
    maxSize: number;
    resourceCount: number;
    utilizationPercent: number;
  } {
    return {
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      resourceCount: this.resources.size,
      utilizationPercent: (this.totalSize / this.maxSize) * 100,
    };
  }
}

/**
 * Object pool for reusing objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (obj: T) => void, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    poolSize: number;
    maxSize: number;
  } {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Abort controller manager for request cancellation
 */
export class AbortControllerManager {
  private controllers = new Map<string, AbortController>();
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Create a new abort controller
   */
  create(id: string, timeout?: number): AbortController {
    // Abort existing controller if any
    this.abort(id);

    const controller = new AbortController();
    this.controllers.set(id, controller);

    // Set timeout if specified
    if (timeout) {
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.controllers.delete(id);
        this.timeouts.delete(id);
      }, timeout);
      this.timeouts.set(id, timeoutId);
    }

    return controller;
  }

  /**
   * Abort a specific request
   */
  abort(id: string): void {
    const controller = this.controllers.get(id);
    if (controller) {
      controller.abort();
      this.controllers.delete(id);
    }

    const timeoutId = this.timeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(id);
    }
  }

  /**
   * Abort all requests
   */
  abortAll(): void {
    for (const controller of this.controllers.values()) {
      controller.abort();
    }
    this.controllers.clear();

    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
  }

  /**
   * Get an abort controller
   */
  get(id: string): AbortController | undefined {
    return this.controllers.get(id);
  }
}

/**
 * Cache with automatic expiration
 */
export class ExpiringCache<K, V> {
  private cache = new Map<K, { value: V; expiresAt: number }>();
  private defaultTTL: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTL = 60000, autoCleanup = true) {
    this.defaultTTL = defaultTTL;

    if (autoCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, Math.min(defaultTTL, 60000)); // Cleanup at least once per minute
    }
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    expiredCount: number;
  } {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      expiredCount,
    };
  }

  /**
   * Destroy the cache (stop cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

/**
 * Global memory manager instance
 */
let globalMemoryManager: MemoryManager | null = null;

/**
 * Get or create global memory manager
 */
export function getGlobalMemoryManager(
  maxSize?: number,
  cleanupThreshold?: number
): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager(maxSize, cleanupThreshold);
  }
  return globalMemoryManager;
}

/**
 * Reset global memory manager
 */
export function resetGlobalMemoryManager(): void {
  if (globalMemoryManager) {
    globalMemoryManager.clear();
  }
  globalMemoryManager = null;
}

/**
 * Estimate object size in bytes (rough approximation)
 */
export function estimateSize(obj: unknown): number {
  const str = JSON.stringify(obj);
  return new Blob([str]).size;
}

/**
 * Force garbage collection hint (works in some environments)
 */
export function hintGC(): void {
  if (typeof global !== 'undefined' && global.gc) {
    global.gc();
  }
}
