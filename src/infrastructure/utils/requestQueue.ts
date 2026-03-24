/**
 * Request Queue and Batching System
 * Manages AI provider requests with concurrency control and rate limiting
 */

/**
 * Priority levels for requests
 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

/**
 * Queued request metadata
 */
interface QueuedRequest<T> {
  id: string;
  priority: RequestPriority;
  timestamp: number;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
  maxRetries: number;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  defaultTimeout: number;
  retryDelay: number;
  enableRateLimit: boolean;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
}

/**
 * Default queue configuration
 */
const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrent: 3,
  maxQueueSize: 50,
  defaultTimeout: 30000,
  retryDelay: 1000,
  enableRateLimit: true,
  rateLimitWindow: 60000, // 1 minute
  rateLimitMaxRequests: 100,
};

/**
 * Request Queue Manager
 */
export class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private running = new Set<string>();
  private config: QueueConfig;
  private requestHistory: number[] = []; // Timestamps for rate limiting
  private isProcessing = false;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a request to the queue
   */
  async add<T>(
    fn: () => Promise<T>,
    priority = RequestPriority.NORMAL,
    maxRetries = 3
  ): Promise<T> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: Math.random().toString(36).substring(7),
        priority,
        timestamp: Date.now(),
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        retries: 0,
        maxRetries,
      };

      this.queue.push(request as QueuedRequest<unknown>);
      this.sortQueue();

      // Start processing if not already running
      if (!this.isProcessing) {
        this.process();
      }
    });
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Earlier requests first
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Process the queue
   */
  private async process(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 || this.running.size > 0) {
      // Check if we can start more requests
      while (
        this.queue.length > 0 &&
        this.running.size < this.config.maxConcurrent
      ) {
        // Check rate limit
        if (this.config.enableRateLimit && !this.canMakeRequest()) {
          break;
        }

        const request = this.queue.shift();
        if (!request) break;

        this.running.add(request.id);
        this.executeRequest(request);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Check if we can make a request based on rate limiting
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;

    // Remove old requests from history
    this.requestHistory = this.requestHistory.filter(
      timestamp => timestamp > windowStart
    );

    return this.requestHistory.length < this.config.rateLimitMaxRequests;
  }

  /**
   * Execute a single request
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      // Record request timestamp for rate limiting
      if (this.config.enableRateLimit) {
        this.requestHistory.push(Date.now());
      }

      // Execute with timeout
      const result = await this.withTimeout(
        request.fn(),
        this.config.defaultTimeout
      );

      request.resolve(result);
    } catch (error) {
      // Retry logic
      if (request.retries < request.maxRetries) {
        request.retries++;
        this.queue.unshift(request as QueuedRequest<unknown>);
        this.sortQueue();
      } else {
        request.reject(error as Error);
      }
    } finally {
      this.running.delete(request.id);
    }
  }

  /**
   * Add timeout to a promise
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Note: This won't actually cancel the underlying fetch unless it uses AbortController
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queued: number;
    running: number;
    rateLimitRemaining: number;
  } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      rateLimitRemaining: this.config.enableRateLimit
        ? this.config.rateLimitMaxRequests -
          this.requestHistory.filter(
            timestamp => Date.now() - timestamp < this.config.rateLimitWindow
          ).length
        : Infinity,
    };
  }

  /**
   * Clear the queue (doesn't affect running requests)
   */
  clear(): void {
    // Reject all queued requests
    for (const request of this.queue) {
      request.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }

  /**
   * Wait for all running requests to complete
   */
  async drain(): Promise<void> {
    while (this.running.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Singleton instance for global request queue
 */
let globalQueue: RequestQueue | null = null;

/**
 * Get or create global request queue
 */
export function getGlobalQueue(config?: Partial<QueueConfig>): RequestQueue {
  if (!globalQueue) {
    globalQueue = new RequestQueue(config);
  }
  return globalQueue;
}

/**
 * Reset global queue (useful for testing)
 */
export function resetGlobalQueue(): void {
  if (globalQueue) {
    globalQueue.clear();
  }
  globalQueue = null;
}

/**
 * Batch multiple requests and execute them together
 */
export async function batchRequest<T>(
  requests: Array<() => Promise<T>>,
  options: {
    concurrency?: number;
    stopOnError?: boolean;
  } = {}
): Promise<T[]> {
  const {
    concurrency = 3,
    stopOnError = false,
  } = options;

  const results: T[] = [];
  const errors: Error[] = [];

  // Process in batches
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(fn => fn())
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason);
        if (stopOnError) {
          throw new Error(
            `Batch request failed: ${errors[0].message}`
          );
        }
      }
    }
  }

  if (errors.length > 0 && !stopOnError) {
    console.warn(`${errors.length} requests failed in batch`);
  }

  return results;
}

/**
 * Debounce function for rapid requests
 */
export function debounceRequest<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: ReturnType<T>) => void) | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise(resolve => {
      pendingArgs = args;
      pendingResolve = resolve as (value: ReturnType<T>) => void;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...(pendingArgs!));
          pendingResolve?.(result);
        } catch (error) {
          // Error will be thrown when pendingResolve is called
          throw error;
        } finally {
          timeoutId = null;
          pendingResolve = null;
          pendingArgs = null;
        }
      }, delay);
    });
  };
}

/**
 * Throttle function for rate-limited requests
 */
export function throttleRequest<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastCall = 0;
  let pendingResolve: ((value: ReturnType<T>) => void) | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise(resolve => {
      pendingArgs = args;

      const execute = async () => {
        lastCall = Date.now();
        try {
          const result = await fn(...(pendingArgs!));
          resolve(result);
        } finally {
          pendingResolve = null;
          pendingArgs = null;
        }
      };

      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall >= interval) {
        execute();
      } else {
        // Queue for next available slot
        const delay = interval - timeSinceLastCall;
        setTimeout(execute, delay);
      }
    });
  };
}
