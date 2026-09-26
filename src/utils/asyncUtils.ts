/**
 * Pauses execution for a specified number of milliseconds.
 *
 * @example
 * await sleep(1000); // sleeps for 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  /** Maximum retry attempts (default: 3) */
  retries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  delay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoff?: number;
  /** Optional callback fired on each failed attempt */
  onRetry?: (error: unknown, attempt: number) => void;
  /** Predicate to decide if error should trigger a retry */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Retries an asynchronous function with exponential backoff.
 *
 * @example
 * const data = await retry(() => fetchExternalApi(), { retries: 3, delay: 500 });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry,
    shouldRetry = () => true,
  } = options;

  let currentDelay = delay;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt > retries || !shouldRetry(err)) {
        throw err;
      }
      if (onRetry) {
        onRetry(err, attempt);
      }
      await sleep(currentDelay);
      currentDelay *= backoff;
    }
  }

  throw lastError;
}

/**
 * Wraps a promise with a timeout. If the promise does not resolve within the given
 * time, it rejects with a timeout error.
 *
 * @example
 * const res = await timeout(longQuery(), 5000, "Query timed out after 5s");
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage = `Operation timed out after ${ms}ms`
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Processes an array of items in batches with concurrency control.
 *
 * @example
 * const results = await batch(userIds, 10, async (id) => fetchUser(id));
 */
export async function batch<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await Promise.all(
      chunk.map((item, idx) => fn(item, i + idx))
    );
    results.push(...chunkResults);
  }
  return results;
}
