/**
 * Retry configuration for a single HTTP request (or the default for all
 * requests on a client when set via {@link TransportConfig.retry}).
 *
 * Defaults (used when a field is omitted):
 * - `maxAttempts` has **no default** — if `retry` is not provided at all, the
 *   request is attempted exactly **once** (no retries). Set `maxAttempts` to
 *   enable retries.
 * - `delay` defaults to **1000 ms** between attempts.
 * - `backoff` defaults to **false** (fixed `delay`); when `true` the delay is
 *   multiplied by `2^(attempt-1)` on each retry (exponential backoff).
 */
export interface RetryConfig {
  /** Maximum number of attempts before giving up. `1` = no retry. */
  maxAttempts: number;
  /** Base delay between attempts, in milliseconds. Default: `1000`. */
  delay?: number; // ms
  /** When `true`, use exponential backoff: `delay * 2^(attempt-1)`. Default: `false`. */
  backoff?: boolean;
}

/**
 * Per-request options accepted by `HttpClient.request` and every client method.
 *
 * Extends the standard `RequestInit` (minus `signal`, which is reserved for
 * abort control) and adds `timeout` and `retry`.
 *
 * Note: a per-request `timeout`/`retry` overrides the client-level defaults
 * supplied through {@link TransportConfig}.
 */
export interface HttpRequestOptions extends Omit<RequestInit, "signal"> {
  /** Per-request timeout in milliseconds. Overrides {@link TransportConfig.timeout}. No timeout when omitted. */
  timeout?: number; // ms
  /** Per-request retry strategy. Overrides {@link TransportConfig.retry}. */
  retry?: RetryConfig;
  /** Abort signal for cancelling the request. */
  signal?: AbortSignal;
}

/**
 * Client-level transport configuration for {@link IntegrationClientOptions.transport}.
 *
 * These values become the **defaults** applied to every request unless a
 * per-request {@link HttpRequestOptions} overrides them.
 *
 * Defaults (used when a field is omitted):
 * - `fetch` defaults to the global `fetch`.
 * - `timeout` is **unset** (no timeout) unless provided.
 * - `retry` is **unset** (single attempt, no retry) unless provided.
 */
export interface TransportConfig {
  /** Custom fetch implementation (e.g. for Node < 18, testing, or proxies). Default: global `fetch`. */
  fetch?: typeof fetch;
  /** Default request timeout in milliseconds. Default: no timeout. */
  timeout?: number;
  /** Default retry strategy for all requests. Default: disabled (single attempt). */
  retry?: RetryConfig;
}
