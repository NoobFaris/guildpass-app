import type { ActivityEvent } from "./types";

export interface ActivityEventSourceLike {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
  close(): void;
}

export interface ActivityStreamConnectionOptions {
  connectionTimeoutMs?: number;
  createEventSource?: (url: string) => ActivityEventSourceLike;
  heartbeatTimeoutMs?: number;
  onEvent: (event: ActivityEvent) => void;
  onFallback: () => void;
  onReady?: () => void;
  url?: string;
}

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 45_000;

export function connectActivityStream({
  connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
  createEventSource = (url) => new EventSource(url),
  heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS,
  onEvent,
  onFallback,
  onReady = () => {},
  url = "/api/activity/stream",
}: ActivityStreamConnectionOptions): () => void {
  let source: ActivityEventSourceLike | null = null;
  let stopped = false;
  let fallbackStarted = false;
  let ready = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const clearWatchdog = () => {
    if (watchdog === null) return;
    clearTimeout(watchdog);
    watchdog = null;
  };

  const armWatchdog = (timeoutMs: number) => {
    clearWatchdog();
    watchdog = setTimeout(startFallback, timeoutMs);
  };

  const markAlive = () => {
    if (stopped || fallbackStarted) return;
    armWatchdog(heartbeatTimeoutMs);
  };

  const onActivity = ((rawEvent: Event) => {
    markAlive();
    const event = parseActivityEvent(rawEvent);
    if (event) onEvent(event);
  }) as EventListener;

  const onHeartbeat = (() => {
    markAlive();
  }) as EventListener;

  const onReadyEvent = (() => {
    const firstReady = !ready;
    ready = true;
    markAlive();
    if (firstReady) onReady();
  }) as EventListener;

  const detach = () => {
    clearWatchdog();
    if (!source) return;
    source.removeEventListener("activity", onActivity);
    source.removeEventListener("error", onError);
    source.removeEventListener("heartbeat", onHeartbeat);
    source.removeEventListener("ready", onReadyEvent);
    source.close();
    source = null;
  };

  const startFallback = () => {
    if (stopped || fallbackStarted) return;
    fallbackStarted = true;
    detach();
    onFallback();
  };

  const onError = (() => {
    startFallback();
  }) as EventListener;

  try {
    source = createEventSource(url);
    source.addEventListener("activity", onActivity);
    source.addEventListener("error", onError);
    source.addEventListener("heartbeat", onHeartbeat);
    source.addEventListener("ready", onReadyEvent);
    armWatchdog(connectionTimeoutMs);
  } catch {
    startFallback();
  }

  return () => {
    stopped = true;
    detach();
  };
}

function parseActivityEvent(rawEvent: Event): ActivityEvent | null {
  if (!("data" in rawEvent) || typeof rawEvent.data !== "string") return null;

  try {
    const value: unknown = JSON.parse(rawEvent.data);
    if (!isActivityEvent(value)) return null;
    return value;
  } catch {
    return null;
  }
}

function isActivityEvent(value: unknown): value is ActivityEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<ActivityEvent>;
  return (
    typeof event.id === "string" &&
    typeof event.type === "string" &&
    typeof event.source === "string" &&
    typeof event.severity === "string" &&
    typeof event.timestamp === "string" &&
    typeof event.description === "string" &&
    typeof event.actor === "object" &&
    event.actor !== null
  );
}
