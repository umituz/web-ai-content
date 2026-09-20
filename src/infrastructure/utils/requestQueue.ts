/**
 * Request Queue and Batching System
 * Manages AI provider requests with concurrency control, timeouts,
 * cancellation, and rate limiting.
 */

import { RequestQueueConfig } from '../../domain/limits/RequestQueueConfig';
import { generateId } from '../../domain/utils/IdGenerator';

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
  fn: (signal: AbortSignal) => Promise<T>;
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
  maxConcurrent: RequestQueueConfig.MAX_CONCURRENT,
  maxQueueSize: RequestQueueConfig.MAX_QUEUE_SIZE,
  defaultTimeout: RequestQueueConfig.DEFAULT_TIMEOUT_MS,
  retryDelay: RequestQueueConfig.RETRY_DELAY_MS,
  enableRateLimit: RequestQueueConfig.RATE_LIMIT.ENABLED,
  rateLimitWindow: RequestQueueConfig.RATE_LIMIT.WINDOW_MS,
  rateLimitMaxRequests: RequestQueueConfig.RATE_LIMIT.MAX_REQUESTS_PER_WINDOW,
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
   * Add a request to the queue. The executor receives the queue's
   * AbortSignal so in-flight work is actually cancelled on timeout.
   */
  async add<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    priority = RequestPriority.NORMAL,
    maxRetries = 3
  ): Promise<T> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: generateId('req'),
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
      await new Promise(resolve => setTimeout(resolve, RequestQueueConfig.POLL_INTERVAL_MS));
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

      // Execute with timeout + abort-based cancellation
      const result = await this.withTimeout(
        request.fn,
        this.config.defaultTimeout
      );

      request.resolve(result);
    } catch (error) {
      // Retry logic with backoff delay to avoid retry storms
      if (request.retries < request.maxRetries) {
        request.retries++;
        const delay = this.config.retryDelay * request.retries;
        setTimeout(() => {
          this.queue.unshift(request as QueuedRequest<unknown>);
          this.sortQueue();
        }, delay);
      } else {
        request.reject(error as Error);
      }
    } finally {
      this.running.delete(request.id);
    }
  }

  /**
   * Run a promise-producing function under a timeout. The executor receives
   * the AbortController's signal, so timeouts cancel the underlying work —
   * not just the caller's promise.
   */
  private async withTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    timeout: number
  ): Promise<T> {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout'));
      }, timeout);
    });

    try {
      const result = await Promise.race([fn(controller.signal), timeoutPromise]);
      return result;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
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
      await new Promise(resolve => setTimeout(resolve, RequestQueueConfig.POLL_INTERVAL_MS));
    }
  }
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
