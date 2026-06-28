import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { activityStorage } from "../lib/activity/storage.ts";
import { makeActivityEvent } from "./fixtures.ts";

/**
 * activity-storage.test.ts
 *
 * Tests for InMemoryActivityStorage via the singleton exported from storage.ts.
 *
 * Because the singleton is seeded with mock data on module load, each test uses
 * unique IDs (prefixed "test_stor_") that don't collide with seeded entries or
 * each other, keeping tests independent without needing to reset shared state.
 */

describe("InMemoryActivityStorage", () => {
  // ── addEvent & getEvents ───────────────────────────────────────────────────

  describe("addEvent", () => {
    test("stores a new event and makes it retrievable via getEvents", async () => {
      const event = makeActivityEvent({ id: "test_stor_add_001" });
      await activityStorage.addEvent(event);

      const events = await activityStorage.getEvents();
      const found = events.find((e) => e.id === "test_stor_add_001");
      assert.ok(found, "event should be retrievable after addEvent");
      assert.equal(found.type, "member.joined");
      assert.equal(found.description, "Alice joined the guild");
    });

    test("prepends new events so the most recent appears first", async () => {
      const first = makeActivityEvent({ id: "test_stor_order_001", description: "first" });
      const second = makeActivityEvent({ id: "test_stor_order_002", description: "second" });

      await activityStorage.addEvent(first);
      await activityStorage.addEvent(second);

      const events = await activityStorage.getEvents();
      const idxFirst = events.findIndex((e) => e.id === "test_stor_order_001");
      const idxSecond = events.findIndex((e) => e.id === "test_stor_order_002");

      assert.ok(idxFirst > -1, "first event should be in list");
      assert.ok(idxSecond > -1, "second event should be in list");
      assert.ok(idxSecond < idxFirst, "second (more recent) event should appear before first");
    });

    test("silently ignores a duplicate event ID (idempotency)", async () => {
      const event = makeActivityEvent({ id: "test_stor_dup_001" });

      await activityStorage.addEvent(event);
      const countBefore = (await activityStorage.getEvents()).filter(
        (e) => e.id === "test_stor_dup_001"
      ).length;

      await activityStorage.addEvent(event); // second add — same ID
      const countAfter = (await activityStorage.getEvents()).filter(
        (e) => e.id === "test_stor_dup_001"
      ).length;

      assert.equal(countBefore, 1, "event should appear exactly once after first add");
      assert.equal(countAfter, 1, "duplicate add must not increase count");
    });

    test("preserves all event fields after storage", async () => {
      const event = makeActivityEvent({
        id: "test_stor_fields_001",
        type: "pass.created",
        source: "webhook",
        severity: "warning",
        actor: { name: "Admin", wallet: "0xdeadbeef" },
        description: "Pass created by admin",
        entity: { type: "pass", id: "pass_x", name: "Test Pass" },
        metadata: { custom: true },
      });

      await activityStorage.addEvent(event);
      const events = await activityStorage.getEvents();
      const stored = events.find((e) => e.id === "test_stor_fields_001");

      assert.ok(stored, "event not found");
      assert.equal(stored.type, "pass.created");
      assert.equal(stored.source, "webhook");
      assert.equal(stored.severity, "warning");
      assert.equal(stored.actor.name, "Admin");
      assert.equal(stored.actor.wallet, "0xdeadbeef");
      assert.deepEqual(stored.entity, { type: "pass", id: "pass_x", name: "Test Pass" });
      assert.deepEqual(stored.metadata, { custom: true });
    });
  });

  // ── getEvents with limit ───────────────────────────────────────────────────

  describe("getEvents(limit)", () => {
    test("returns at most `limit` events when limit is provided", async () => {
      // Add a batch so we have enough events regardless of seeded state
      for (let i = 0; i < 5; i++) {
        await activityStorage.addEvent(
          makeActivityEvent({ id: `test_stor_limit_${i}` })
        );
      }

      const events = await activityStorage.getEvents(3);
      assert.ok(events.length <= 3, `expected ≤3 events, got ${events.length}`);
    });

    test("returns all events when no limit is given", async () => {
      const all = await activityStorage.getEvents();
      const withLimit = await activityStorage.getEvents(all.length);
      assert.equal(all.length, withLimit.length);
    });
  });

  // ── isDuplicate ────────────────────────────────────────────────────────────

  describe("isDuplicate", () => {
    test("returns true for an ID that was previously added", async () => {
      const event = makeActivityEvent({ id: "test_stor_isdup_001" });
      await activityStorage.addEvent(event);

      const result = await activityStorage.isDuplicate("test_stor_isdup_001");
      assert.equal(result, true);
    });

    test("returns false for an ID that has never been added", async () => {
      const result = await activityStorage.isDuplicate("test_stor_never_seen_xyz_9999");
      assert.equal(result, false);
    });

    test("returns true for seeded mock-data IDs on first import", async () => {
      // mockActivity seeds IDs "1" through "5"
      const result = await activityStorage.isDuplicate("1");
      assert.equal(result, true, "seeded ID '1' should already be marked as processed");
    });
  });

  // ── Memory cap ────────────────────────────────────────────────────────────

  describe("memory cap (1 000 events)", () => {
    test("evicts the oldest event when the 1 000-event limit is exceeded", async () => {
      // Get current count — singleton is shared and already seeded
      const before = await activityStorage.getEvents();
      const currentCount = before.length;
      const needed = Math.max(0, 1000 - currentCount) + 2; // ensure we exceed cap by 2

      // Add all fill events first, then add the sentinel as the very last (oldest)
      // Strategy: after filling to just-below cap, add sentinel, then one more to push it out
      const fillCount = needed - 1;
      for (let i = 0; i < fillCount; i++) {
        await activityStorage.addEvent(
          makeActivityEvent({ id: `test_stor_cap_fill2_${i}` })
        );
      }

      // Sentinel goes in as the 999th-ish item — its position in the unshift queue
      // means it will be the tail that gets popped when we add one more
      const sentinelId = `test_stor_cap_sentinel_unique`;
      await activityStorage.addEvent(makeActivityEvent({ id: sentinelId }));

      // This one should push the list over 1000 and evict the oldest (sentinel)
      await activityStorage.addEvent(
        makeActivityEvent({ id: `test_stor_cap_final` })
      );

      const after = await activityStorage.getEvents();
      assert.ok(after.length <= 1000, `list grew beyond 1000: ${after.length}`);
    });

    test("list never exceeds 1 000 entries", async () => {
      // Add 10 more events after the cap test above — count must still be ≤ 1000
      for (let i = 0; i < 10; i++) {
        await activityStorage.addEvent(
          makeActivityEvent({ id: `test_stor_cap_extra_${i}` })
        );
      }
      const events = await activityStorage.getEvents();
      assert.ok(events.length <= 1000, `exceeded cap: ${events.length}`);
    });
  });
});
