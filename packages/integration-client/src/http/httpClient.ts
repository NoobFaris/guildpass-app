import type { HttpRequestOptions, TransportConfig } from "./http.types.js";

export class HttpClient {
  private config: TransportConfig;

  constructor(config: TransportConfig = {}) {
    this.config = config;
  }

  async request(url: string, options: HttpRequestOptions = {}): Promise<Response> {
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
          return response;
        }

        // Transient failure, prepare for retry
      } catch (error: any) {
        if (externalSignal?.aborted && (error === externalSignal.reason || error.name === "AbortError")) {
          throw externalSignal.reason ?? error;
        }
        if (attempt >= maxAttempts) {
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

    throw new Error("Request failed after max attempts");
  }

  private isTransient(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }
}
