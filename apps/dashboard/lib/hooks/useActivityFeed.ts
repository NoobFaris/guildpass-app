"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ActivityEvent } from "@guildpass/integration-client";
import { type ActivityQuery } from "@/lib/activity/query";
import { type Activity, fetchActivity, generateMockActivity } from "@/lib/mock-data";

const REFRESH_MS =
  Number(process.env.NEXT_PUBLIC_ACTIVITY_REFRESH_MS) || 15_000;

interface UseActivityFeedOptions extends Omit<ActivityQuery, "cursor"> {
  /** How many events to request per page. */
  limit?: number;
  autoRefresh?: boolean;
  simulate?: boolean;
}

interface UseActivityFeedResult {
  events: ActivityEvent[];
  lastUpdated: Date | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  total: number;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
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

export function useActivityFeed({
  limit,
  type,
  source,
  severity,
  entityType,
  actor,
  from,
  autoRefresh = true,
  simulate = true,
}: UseActivityFeedOptions = {}): UseActivityFeedResult {
  const [events, setEvents]             = useState<ActivityEvent[]>([]);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [nextCursor, setNextCursor]     = useState<string | null>(null);
  const [total, setTotal]               = useState(0);
  const [error, setError]               = useState<string | null>(null);
  const seenIds                         = useRef(new Set<string>());

  const query = useMemo<ActivityQuery>(
    () => ({
      limit,
      type,
      source,
      severity,
      entityType,
      actor: actor?.trim() || undefined,
      from,
    }),
    [limit, type, source, severity, entityType, actor, from]
  );

  const hasFilters = Boolean(type || source || severity || entityType || actor?.trim() || from);

  const replaceEvents = useCallback((incoming: ActivityEvent[]) => {
    seenIds.current = new Set(incoming.map((event) => event.id));
    setEvents(incoming);
    setLastUpdated(new Date());
  }, []);

  const appendEvents = useCallback((incoming: ActivityEvent[]) => {
    const fresh = incoming.filter((event) => !seenIds.current.has(event.id));
    if (fresh.length === 0) return;

    fresh.forEach((event) => seenIds.current.add(event.id));
    setEvents((previous) =>
      [...previous, ...fresh].sort(compareActivityEvents)
    );
    setLastUpdated(new Date());
  }, []);

  const prependLiveEvent = useCallback((event: ActivityEvent) => {
    if (seenIds.current.has(event.id)) return;

    seenIds.current.add(event.id);
    setEvents((previous) => {
      const merged = [event, ...previous].sort(compareActivityEvents);
      return limit ? merged.slice(0, limit) : merged;
    });
    setLastUpdated(new Date());
  }, [limit]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchActivity(query);
      replaceEvents(data.events.map(toActivityEvent));
      setNextCursor(data.nextCursor);
      setTotal(data.total);
      setError(null);

      if (simulate && !hasFilters) {
        prependLiveEvent(toActivityEvent(generateMockActivity()));
      }
    } catch {
      setError("Activity feed is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [hasFilters, prependLiveEvent, query, replaceEvents, simulate]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const data = await fetchActivity({ ...query, cursor: nextCursor });
      appendEvents(data.events.map(toActivityEvent));
      setNextCursor(data.nextCursor);
      setTotal(data.total);
      setError(null);
    } catch {
      setError("More activity could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  }, [appendEvents, loadingMore, nextCursor, query]);

  useEffect(() => {
    seenIds.current.clear();
    setEvents([]);
    setNextCursor(null);
    setTotal(0);
    setLoading(true);
    refresh();

    const tick = () => {
      // Pause polling while the tab is hidden to avoid wasted requests
      if (document.visibilityState === "visible") refresh();
    };

    const id = autoRefresh ? setInterval(tick, REFRESH_MS) : null;
    if (autoRefresh) {
      document.addEventListener("visibilitychange", tick);
    }

    return () => {
      if (id) clearInterval(id);
      if (autoRefresh) {
        document.removeEventListener("visibilitychange", tick);
      }
    };
  }, [autoRefresh, refresh]);

  return {
    events,
    lastUpdated,
    loading,
    loadingMore,
    hasMore: Boolean(nextCursor),
    total,
    error,
    loadMore,
    refresh,
  };
}

function compareActivityEvents(a: ActivityEvent, b: ActivityEvent): number {
  const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  if (timeDiff !== 0) return timeDiff;
  return b.id.localeCompare(a.id);
}
