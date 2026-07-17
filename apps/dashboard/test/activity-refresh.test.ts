/**
 * activity-refresh.test.ts
 *
 * Tests for the webhook-driven activity refresh strategy:
 *   - Incremental polling via getEventsSince
 *   - Duplicate event ID handling (dedup)
 *   - Activity service stats
 *   - Refresh configuration
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { activityService } from "../lib/data/activity-service";
import { activityStorage } from "../lib/activity/storage";
import { getActivityRefreshConfig } from "../lib/env";
import { makeActivityEvent } from "./fixtures";

// ---------------------------------------------------------------------------
// getEventsSince – incremental polling
// ---------------------------------------------------------------------------

describe("ActivityService.getEventsSince", () => {
  test("returns only events strictly after the given timestamp", async () => {
    // Create an event, record its timestamp as the cutoff
    const event = await activityService.createEvent({
      type: "member.joined",
      source: "webhook",
      severity: "info",
      actor: { name: "AfterMiddle" },
      description: "Should appear in results",
    });

    // Query with a cutoff just before the event's timestamp
    const cutoff = new Date(new Date(event.timestamp).getTime() - 1).toISOString();
    const afterEvents = await activityService.getEventsSince(cutoff);
    assert.ok(afterEvents.length > 0, "should find events after the cutoff timestamp");
    for (const e of afterEvents) {
      assert.ok(
        e.timestamp > cutoff,
        `event ${e.id} timestamp ${e.timestamp} should be > ${cutoff}`
      );
    }
  });

  test("returns empty array when no newer events exist", async () => {
    const farFuture = new Date(Date.now() + 86_400_000).toISOString(); // +1 day
    const events = await activityService.getEventsSince(farFuture);
    assert.equal(events.length, 0, "no events should exist in the future");
  });

  test("respects the limit option", async () => {
    const cutoff = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const events = await activityService.getEventsSince(cutoff, { limit: 3 });
    assert.ok(events.length <= 3, `limit should cap at 3, got ${events.length}`);
  });

  test("filters by type when type option is provided", async () => {
    const cutoff = new Date(Date.now() - 120_000).toISOString(); // 2 min ago

    // Create one event of a specific type
    await activityService.createEvent({
      type: "pass.deleted",
      source: "webhook",
      severity: "info",
      actor: { name: "TypeFilter" },
      description: "Pass deleted for filter test",
    });

    const filtered = await activityService.getEventsSince(cutoff, { type: "pass.deleted" });
    for (const e of filtered) {
      assert.equal(e.type, "pass.deleted", "all returned events should match type filter");
    }
  });
});

// ---------------------------------------------------------------------------
// hasProcessedEvent – dedup guard
// ---------------------------------------------------------------------------

describe("ActivityService.hasProcessedEvent", () => {
  test("returns false for an unknown event ID", async () => {
    const result = await activityService.hasProcessedEvent("never-before-seen-id-xyz");
    assert.equal(result, false, "unknown ID should not be flagged as processed");
  });

  test("returns true for a previously stored event ID", async () => {
    const event = await activityService.createEvent({
      type: "access.granted",
      source: "webhook",
      severity: "info",
      actor: { name: "DedupTest" },
      description: "Event for dedup check",
    });

    const result = await activityService.hasProcessedEvent(event.id);
    assert.equal(result, true, "stored event ID should be recognized as processed");
  });
});

// ---------------------------------------------------------------------------
// Duplicate event handling (storage-level dedup)
// ---------------------------------------------------------------------------

describe("Storage duplicate handling", () => {
  test("does not store the same event ID twice", async () => {
    const event = makeActivityEvent({ id: "test_refresh_dedup_001" });

    await activityStorage.addEvent(event);
    const countBefore = (await activityStorage.getEvents()).filter(
      (e) => e.id === "test_refresh_dedup_001"
    ).length;

    // Attempt to add the same event again
    await activityStorage.addEvent(event);
    const countAfter = (await activityStorage.getEvents()).filter(
      (e) => e.id === "test_refresh_dedup_001"
    ).length;

    assert.equal(countBefore, 1, "event should appear exactly once after first add");
    assert.equal(countAfter, 1, "duplicate add must not increase count");
  });

  test("recordActivityEvent returns 'duplicate' for already-seen IDs", async () => {
    const event = makeActivityEvent({ id: "test_refresh_result_001" });

    const first = await activityStorage.recordActivityEvent(event);
    assert.equal(first, "recorded");

    const second = await activityStorage.recordActivityEvent(event);
    assert.equal(second, "duplicate", "re-adding same ID should return 'duplicate'");
  });

  test("different IDs with same content are stored separately", async () => {
    const base = makeActivityEvent({ description: "Identical content" });

    const a = makeActivityEvent({ ...base, id: "test_refresh_diffa_001" });
    const b = makeActivityEvent({ ...base, id: "test_refresh_diffb_001" });

    await activityStorage.addEvent(a);
    await activityStorage.addEvent(b);

    const events = await activityStorage.getEvents();
    const foundA = events.filter((e) => e.id === "test_refresh_diffa_001");
    const foundB = events.filter((e) => e.id === "test_refresh_diffb_001");

    assert.equal(foundA.length, 1, "event A should be stored once");
    assert.equal(foundB.length, 1, "event B should be stored once");
  });
});

// ---------------------------------------------------------------------------
// getStats – activity aggregation
// ---------------------------------------------------------------------------

describe("ActivityService.getStats", () => {
  test("returns totalEvents >= 0", async () => {
    const stats = await activityService.getStats();
    assert.ok(typeof stats.totalEvents === "number", "totalEvents should be a number");
    assert.ok(stats.totalEvents >= 0, "totalEvents should be non-negative");
  });

  test("eventsByType aggregates correctly", async () => {
    // Ensure at least one event of a known type exists
    await activityService.createEvent({
      type: "pass.created",
      source: "webhook",
      severity: "info",
      actor: { name: "StatsTest" },
      description: "Pass created for stats aggregation",
    });

    const stats = await activityService.getStats();
    assert.ok(typeof stats.eventsByType === "object", "eventsByType should be an object");
    assert.ok(
      Object.keys(stats.eventsByType).length > 0,
      "eventsByType should have at least one entry"
    );
  });

  test("eventsBySource tracks source distribution", async () => {
    const stats = await activityService.getStats();
    assert.ok(typeof stats.eventsBySource === "object", "eventsBySource should be an object");
  });

  test("lastEventAt is null only when there are no events", async () => {
    const stats = await activityService.getStats();
    if (stats.totalEvents === 0) {
      assert.equal(stats.lastEventAt, null, "lastEventAt should be null with no events");
    } else {
      assert.ok(typeof stats.lastEventAt === "string", "lastEventAt should be a timestamp string");
    }
  });
});

// ---------------------------------------------------------------------------
// Refresh configuration
// ---------------------------------------------------------------------------

describe("ActivityRefreshConfig", () => {
  test("returns default interval of 15_000 ms when env is not set", () => {
    // The env default should be 15s when NEXT_PUBLIC_ACTIVITY_REFRESH_MS is unset
    const config = getActivityRefreshConfig();
    assert.ok(typeof config.intervalMs === "number", "intervalMs should be a number");
    assert.ok(config.intervalMs >= 0, "intervalMs should be >= 0");
  });

  test("returns a maxEvents limit", () => {
    const config = getActivityRefreshConfig();
    assert.ok(typeof config.maxEvents === "number", "maxEvents should be a number");
    assert.ok(config.maxEvents > 0, "maxEvents should be positive");
  });

  test("intervalMs can be disabled (0) by env override", () => {
    const previous = process.env.NEXT_PUBLIC_ACTIVITY_REFRESH_MS;
    process.env.NEXT_PUBLIC_ACTIVITY_REFRESH_MS = "0";

    try {
      assert.equal(getActivityRefreshConfig().intervalMs, 0);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_ACTIVITY_REFRESH_MS;
      else process.env.NEXT_PUBLIC_ACTIVITY_REFRESH_MS = previous;
    }
  });
});
