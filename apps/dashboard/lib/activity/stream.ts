import type { ActivityEvent } from "./types";

type ActivitySubscriber = (event: ActivityEvent) => void;

interface ActivityStreamState {
  subscribers: Set<ActivitySubscriber>;
}

const globalActivityStream = globalThis as typeof globalThis & {
  __guildpassActivityStream?: ActivityStreamState;
};

const streamState =
  globalActivityStream.__guildpassActivityStream ??
  (globalActivityStream.__guildpassActivityStream = {
    subscribers: new Set<ActivitySubscriber>(),
  });

export function publishActivityEvent(event: ActivityEvent): void {
  for (const subscriber of streamState.subscribers) {
    try {
      subscriber(event);
    } catch (error) {
      console.error("Activity stream subscriber failed:", error);
    }
  }
}

export function subscribeToActivityEvents(
  subscriber: ActivitySubscriber
): () => void {
  streamState.subscribers.add(subscriber);
  return () => {
    streamState.subscribers.delete(subscriber);
  };
}

export function encodeActivityEvent(event: ActivityEvent): string {
  return `event: activity\ndata: ${JSON.stringify(event)}\n\n`;
}

export function getActivitySubscriberCount(): number {
  return streamState.subscribers.size;
}
