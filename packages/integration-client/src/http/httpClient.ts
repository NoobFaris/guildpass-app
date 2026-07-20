import { type HttpRequestOptions, type TransportConfig, DEFAULT_RETRY_CONFIG } from "./http.types.js";
import { CircuitBreaker, CircuitOpenError, type CircuitBreakerStatus } from "./circuitBreaker.js";

export class HttpClient {
  private config: TransportConfig;
  private breaker?: CircuitBreaker;

  constructor(config: TransportConfig = {}) {
    this.config = {
      ...config,
      retry: config.retry === undefined ? DEFAULT_RETRY_CONFIG : config.retry,
    };
    if (config.circuitBreaker) {
      this.breaker = new CircuitBreaker(config.circuitBreaker);
    }
  }

  async request(url: string, options: HttpRequestOptions = {}): Promise<Response> {
    if (this.breaker && !this.breaker.canRequest()) {
      const status = this.breaker.getStatus();
      throw new CircuitOpenError(status.retryAt ?? Date.now());
    }

    const {
      timeout = this.config.timeout,
      retry = this.config.retry,
      signal: externalSignal,
      ...fetchOptions
    } = options;

    const fetchFn = this.config.fetch ?? fetch;
    const maxAttempts = retry?.maxAttempts ?? 1;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      const signal = controller.signal;

      const onAbort = () => {
        controller.abort(externalSignal?.reason);
      };

      if (externalSignal) {
        if (externalSignal.aborted) throw externalSignal.reason ?? new Error("Aborted");
        externalSignal.addEventListener("abort", onAbort);
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (timeout) {
        timeoutId = setTimeout(() => {
          controller.abort(new Error(`Timeout: Request exceeded ${timeout}ms`));
        }, timeout);
      }

      try {
        const response = await fetchFn(url, {
          ...fetchOptions,
          signal,
        });

        if (response.ok || attempt >= maxAttempts || !this.isTransient(response.status)) {
          if (this.breaker) {
            if (response.ok || !this.isTransient(response.status)) {
              this.breaker.recordSuccess();
            } else {
              this.breaker.recordFailure();
            }
          }
          return response;
        }
      } catch (error: any) {
        if (externalSignal?.aborted && (error === externalSignal.reason || error.name === "AbortError")) {
          throw externalSignal.reason ?? error;
        }
        if (attempt >= maxAttempts) {
          this.breaker?.recordFailure();
          throw error;
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener("abort", onAbort);
      }

      if (retry) {
        const delay = retry.delay ?? 1000;
        const sleepTime = retry.backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
      }
    }

    this.breaker?.recordFailure();
    throw new Error("Request failed after max attempts");
  }

  getStatus(): CircuitBreakerStatus | null {
    return this.breaker ? this.breaker.getStatus() : null;
  }

  private isTransient(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }
}
