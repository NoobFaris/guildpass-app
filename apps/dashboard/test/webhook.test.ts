import { test, describe } from "node:test";
import assert from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ActivityEvent } from "../lib/activity/types.js";

const { generateSignature } = await import("@guildpass/webhook-utils");
const { activityStorage, FileActivityStorage } = await import("../lib/activity/storage.js");

// Note: In a real Next.js environment, we'd use a more sophisticated test runner
// but for this task, we're demonstrating the core logic verification.

describe("Webhook Ingestion", () => {
  const secret = "test-secret";
  
  test("should correctly verify a valid signature", async () => {
    const payload = JSON.stringify({
      id: "evt_123",
      type: "membership.created",
      created: Math.floor(Date.now() / 1000),
      data: { wallet: "0x123", name: "Alice" }
    });

    const { signature } = generateSignature({ secret, payload });
    
    // This mimics the logic in our route handler
    const { verifySignature } = await import("@guildpass/webhook-utils");
    const result = verifySignature({
      signatureHeader: signature,
      secret,
      payload
    });

    assert.strictEqual(result.valid, true);
  });

  test("should reject an invalid signature", async () => {
    const payload = "tampered payload";
    const { signature } = generateSignature({ secret: "wrong-secret", payload });
    
    const { verifySignature } = await import("@guildpass/webhook-utils");
    const result = verifySignature({
      signatureHeader: signature,
      secret,
      payload
    });

    assert.strictEqual(result.valid, false);
  });

  test("should handle duplicate events idempotently", async () => {
    const eventId = "duplicate_123";
    const event: ActivityEvent = {
      id: eventId,
      type: "pass.created",
      source: "webhook",
      severity: "info",
      description: "Test Pass",
      timestamp: new Date().toISOString(),
      actor: {
        name: "Admin"
      }
    };

    await activityStorage.addEvent(event);
    const isDuplicate = await activityStorage.isDuplicate(eventId);
    assert.strictEqual(isDuplicate, true);
    
    const countBefore = (await activityStorage.getEvents()).length;
    await activityStorage.addEvent(event);
    const countAfter = (await activityStorage.getEvents()).length;
    
    assert.strictEqual(countBefore, countAfter);
  });

  test("file storage keeps processed webhook IDs across restarts", async () => {
    const storeDir = await mkdtemp(join(tmpdir(), "guildpass-activity-"));

    try {
      const firstStore = new FileActivityStorage(storeDir);
      const event: ActivityEvent = {
        id: "evt_persistent_123",
        type: "member.joined",
        source: "webhook",
        severity: "info",
        actor: {
          name: "Alice"
        },
        timestamp: new Date().toISOString(),
        description: "New member joined: Alice"
      };

      assert.strictEqual(await firstStore.recordActivityEvent(event), "recorded");

      const restartedStore = new FileActivityStorage(storeDir);
      assert.strictEqual(await restartedStore.hasProcessedEvent(event.id), true);
      assert.strictEqual(await restartedStore.recordActivityEvent(event), "duplicate");
    } finally {
      await rm(storeDir, { recursive: true, force: true });
    }
  });

  test("file storage records only one event for concurrent duplicate submissions", async () => {
    const storeDir = await mkdtemp(join(tmpdir(), "guildpass-activity-"));

    try {
      const storage = new FileActivityStorage(storeDir);
      const event: ActivityEvent = {
        id: "evt_concurrent_123",
        type: "pass.updated",
        source: "webhook",
        severity: "info",
        actor: {
          name: "Admin"
        },
        timestamp: new Date().toISOString(),
        description: "Pass updated: Gold Pass"
      };

      const results = await Promise.all([
        storage.recordActivityEvent(event),
        storage.recordActivityEvent(event),
        storage.recordActivityEvent(event)
      ]);

      assert.strictEqual(results.filter((result) => result === "recorded").length, 1);
      assert.strictEqual(results.filter((result) => result === "duplicate").length, 2);
      assert.strictEqual((await storage.getEvents()).length, 1);
    } finally {
      await rm(storeDir, { recursive: true, force: true });
    }
  });
});
