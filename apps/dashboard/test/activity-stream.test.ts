import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { NextRequest } from "next/server";
import { generateSignature } from "@guildpass/webhook-utils";
import {
  connectActivityStream,
  type ActivityEventSourceLike,
} from "../lib/activity/client-stream";
import {
  getActivitySubscriberCount,
  publishActivityEvent,
  subscribeToActivityEvents,
} from "../lib/activity/stream";
import { GET as streamActivity } from "../app/api/activity/stream/route";
import { POST as receiveWebhook } from "../app/api/webhooks/route";
import { scheduleActivityReconciliation } from "../lib/hooks/useActivityFeed";
import { makeActivityEvent, makeWebhookPayload } from "./fixtures";

class FakeEventSource implements ActivityEventSourceLike {
  private listeners = new Map<string, Set<EventListener>>();
  closeCount = 0;

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closeCount += 1;
  }

  emit(type: string, data?: string): void {
    const event = { type, data } as unknown as Event;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe("activity SSE delivery", () => {
  test("delivers a published event through a simulated SSE connection in under one second", async () => {
    const initialSubscribers = getActivitySubscriberCount();
    const response = await streamActivity(
      new Request("https://example.test/api/activity/stream")
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
    assert.equal(getActivitySubscriberCount(), initialSubscribers + 1);
    assert.ok(response.body);

    const reader = response.body.getReader();
    try {
      const decoder = new TextDecoder();
      const ready = await readWithTimeout(reader, 500);
      assert.equal(ready.done, false);
      assert.match(decoder.decode(ready.value), /event: ready/);

      const event = makeActivityEvent({ id: `evt_stream_${Date.now()}` });
      const startedAt = performance.now();
      publishActivityEvent(event);
      const delivered = await readWithTimeout(reader, 900);
      const elapsedMs = performance.now() - startedAt;

      assert.equal(delivered.done, false);
      assert.ok(elapsedMs < 1_000, `delivery took ${elapsedMs}ms`);
      assert.match(decoder.decode(delivered.value), /event: activity/);
      assert.match(decoder.decode(delivered.value), new RegExp(event.id));
    } finally {
      await reader.cancel();
    }
    assert.equal(getActivitySubscriberCount(), initialSubscribers);
  });

  test("client connector accepts activity and falls back exactly once on stream error", () => {
    const source = new FakeEventSource();
    const received: string[] = [];
    let fallbackCount = 0;
    const event = makeActivityEvent({ id: "evt_client_stream_001" });

    const disconnect = connectActivityStream({
      createEventSource: () => source,
      onEvent: (activity) => received.push(activity.id),
      onFallback: () => {
        fallbackCount += 1;
      },
    });

    source.emit("ready", "{}");
    source.emit("activity", JSON.stringify(event));
    source.emit("activity", "not-json");
    source.emit("error");
    source.emit("error");

    assert.deepEqual(received, [event.id]);
    assert.equal(fallbackCount, 1);
    assert.equal(source.closeCount, 1);

    disconnect();
    assert.equal(source.closeCount, 1);
  });

  test("ready handshake reconciles the REST snapshot after subscription", () => {
    const source = new FakeEventSource();
    const received: string[] = [];
    let reconciliationCount = 0;
    const event = makeActivityEvent({ id: "evt_during_initial_snapshot" });

    const disconnect = connectActivityStream({
      createEventSource: () => source,
      onEvent: (activity) => received.push(activity.id),
      onFallback: () => assert.fail("stream should remain healthy"),
      onReady: () => {
        reconciliationCount += 1;
      },
    });

    source.emit("activity", JSON.stringify(event));
    source.emit("ready", "{}");
    source.emit("ready", "{}");

    assert.deepEqual(received, [event.id]);
    assert.equal(reconciliationCount, 1);
    disconnect();
  });

  test("client falls back when the stream never becomes ready", async () => {
    const source = new FakeEventSource();
    let fallbackCount = 0;

    connectActivityStream({
      connectionTimeoutMs: 10,
      createEventSource: () => source,
      heartbeatTimeoutMs: 100,
      onEvent: () => {},
      onFallback: () => {
        fallbackCount += 1;
      },
    });

    await delay(30);
    assert.equal(fallbackCount, 1);
    assert.equal(source.closeCount, 1);
  });

  test("client falls back when a ready stream stops sending heartbeats", async () => {
    const source = new FakeEventSource();
    let fallbackCount = 0;

    connectActivityStream({
      connectionTimeoutMs: 100,
      createEventSource: () => source,
      heartbeatTimeoutMs: 10,
      onEvent: () => {},
      onFallback: () => {
        fallbackCount += 1;
      },
    });

    source.emit("ready", "{}");
    await delay(30);
    assert.equal(fallbackCount, 1);
    assert.equal(source.closeCount, 1);
  });

  test("server disconnects a stream whose bounded output queue fills", async () => {
    const initialSubscribers = getActivitySubscriberCount();
    const response = await streamActivity(
      new Request("https://example.test/api/activity/stream")
    );
    assert.ok(response.body);
    assert.equal(getActivitySubscriberCount(), initialSubscribers + 1);

    for (let index = 0; index < 64; index += 1) {
      publishActivityEvent(makeActivityEvent({ id: `evt_queue_${index}` }));
    }

    assert.equal(getActivitySubscriberCount(), initialSubscribers);
    await assert.rejects(response.body.getReader().read(), /backpressure limit/);
  });

  test("coalesces live events before authoritative REST reconciliation", async () => {
    let reconciliationCount = 0;
    const reconcile = () => {
      reconciliationCount += 1;
    };

    const firstTimer = scheduleActivityReconciliation(null, reconcile, 10);
    scheduleActivityReconciliation(firstTimer, reconcile, 10);

    await delay(30);
    assert.equal(reconciliationCount, 1);
  });

  test("webhook publication happens once after a new event is recorded", async () => {
    const previousSecret = process.env.WEBHOOK_SECRET;
    const secret = "activity-stream-test-secret";
    const payload = makeWebhookPayload({ id: `whk_stream_${Date.now()}` });
    const body = JSON.stringify(payload);
    const { signature } = generateSignature({ secret, payload: body });
    const published: string[] = [];
    const unsubscribe = subscribeToActivityEvents((event) => published.push(event.id));
    process.env.WEBHOOK_SECRET = secret;

    try {
      const first = await receiveWebhook(webhookRequest(body, signature));
      const duplicate = await receiveWebhook(webhookRequest(body, signature));

      assert.equal(first.status, 200);
      assert.equal(duplicate.status, 200);
      assert.deepEqual(published, [payload.id]);
      assert.equal((await duplicate.json()).data.reason, "duplicate");
    } finally {
      unsubscribe();
      if (previousSecret === undefined) delete process.env.WEBHOOK_SECRET;
      else process.env.WEBHOOK_SECRET = previousSecret;
    }
  });
});

function webhookRequest(body: string, signature: string): NextRequest {
  return new NextRequest("https://example.test/api/webhooks", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-guildpass-signature": signature,
    },
  });
}

function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`SSE read exceeded ${timeoutMs}ms`)),
      timeoutMs
    );
    reader.read().then(
      (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function delay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}
