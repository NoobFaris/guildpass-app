export interface RetryConfig {
  maxAttempts: number;
  delay?: number; // ms
  backoff?: boolean;
}

export interface HttpRequestOptions extends Omit<RequestInit, "signal"> {
  timeout?: number; // ms
  retry?: RetryConfig;
  signal?: AbortSignal;
}

export interface TransportConfig {
  fetch?: typeof fetch;
  timeout?: number;
  retry?: RetryConfig;
}
