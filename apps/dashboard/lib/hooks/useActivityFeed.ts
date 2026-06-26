"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type ActivityEvent } from "@guildpass/integration-client";
import { type Activity, fetchActivity, generateMockActivity } from "@/lib/mock-data";

const REFRESH_MS =
  Number(process.env.NEXT_PUBLIC_ACTIVITY_REFRESH_MS) || 15_000;

interface UseActivityFeedOptions {
  /** How many events to surface at most (default: unlimited). */
  limit?: number;
}

interface UseActivityFeedResult {
  events: ActivityEvent[];
  lastUpdated: Date | null;
  loading: boolean;
}

const TYPE_MAP: Record<Activity["type"], ActivityEvent["type"]> = {
  member_joined: "member.joined",
  pass_created: "pass.created",
  pass_purchased: "pass.purchased",
  role_changed: "member.roles_changed",
  access_granted: "access.granted",
};

function isActivityEvent(activity: Activity | ActivityEvent): activity is ActivityEvent {
  return "source" in activity && "severity" in activity;
}

function toActivityEvent(activity: Activity | ActivityEvent): ActivityEvent {
  if (isActivityEvent(activity)) return activity;

function toActivityEvent(activity: Activity): ActivityEvent {
  return {
    id: activity.id,
    type: TYPE_MAP[activity.type],
    source: "dashboard",
    severity: "info",
    actor: {
      name: activity.actor,
    },
    timestamp: activity.timestamp,
    description: activity.description,
  };
}

export function useActivityFeed({ limit }: UseActivityFeedOptions = {}): UseActivityFeedResult {
  const [events, setEvents]           = useState<ActivityEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]         = useState(true);
  const seenIds                       = useRef(new Set<string>());

  const mergeEvents = useCallback((incoming: ActivityEvent[]) => {
    const fresh = incoming.filter((e) => !seenIds.current.has(e.id));
    if (fresh.length === 0) return;
    fresh.forEach((e) => seenIds.current.add(e.id));
    setEvents((prev) => {
      const merged = [...fresh, ...prev].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return limit ? merged.slice(0, limit) : merged;
    });
    setLastUpdated(new Date());
  }, [limit]);

  /** Single poll tick: fetch real/mock data + inject one simulated event in mock mode. */
  const poll = useCallback(async () => {
    try {
      const data = await fetchActivity();
      mergeEvents(data.map(toActivityEvent));
      // Simulate a new arriving event every tick in mock/dev mode
      const mock = generateMockActivity();
      mergeEvents([toActivityEvent(mock)]);
    } catch {
      // Silently swallow fetch errors; the feed keeps its last known state
    } finally {
      setLoading(false);
    }
  }, [mergeEvents]);

  useEffect(() => {
    // Initial load
    poll();

    const tick = () => {
      // Pause polling while the tab is hidden to avoid wasted requests
      if (document.visibilityState === "visible") poll();
    };

    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [poll]);

  return { events, lastUpdated, loading };
}
