"use client";

import DashboardLayout from "@/components/DashboardLayout";
import LastUpdated from "@/components/LastUpdated";
import { useActivityFeed } from "@/lib/hooks/useActivityFeed";
import {
  type ActivityEventSeverity,
  type ActivityEventSource,
  type ActivityEventType,
} from "@guildpass/integration-client";
import { useMemo, useState } from "react";

const TYPE_ICON: Record<ActivityEventType, string> = {
  "member.joined": "👤",
  "member.left": "🚪",
  "member.roles_changed": "🔄",
  "pass.created": "🎫",
  "pass.updated": "⚙️",
  "pass.purchased": "💳",
  "pass.deleted": "🗑️",
  "guild.created": "🏰",
  "guild.updated": "🏰",
  "guild.deleted": "🏚️",
  "access.granted": "🔓",
  "access.revoked": "🔒",
  "verification.completed": "✅",
  "webhook.received": "📡",
};

const TYPE_COLOR: Record<ActivityEventType, string> = {
  "member.joined": "bg-green-100",
  "member.left": "bg-orange-100",
  "member.roles_changed": "bg-yellow-100",
  "pass.created": "bg-blue-100",
  "pass.updated": "bg-blue-100",
  "pass.purchased": "bg-purple-100",
  "pass.deleted": "bg-red-100",
  "guild.created": "bg-pink-100",
  "guild.updated": "bg-pink-100",
  "guild.deleted": "bg-red-100",
  "access.granted": "bg-green-100",
  "access.revoked": "bg-red-100",
  "verification.completed": "bg-emerald-100",
  "webhook.received": "bg-indigo-100",
};

const TYPE_FILTERS: { label: string; value: ActivityEventType | "" }[] = [
  { label: "All event types", value: "" },
  { label: "Members joined", value: "member.joined" },
  { label: "Role changes", value: "member.roles_changed" },
  { label: "Pass created", value: "pass.created" },
  { label: "Pass purchased", value: "pass.purchased" },
  { label: "Access granted", value: "access.granted" },
  { label: "Webhook received", value: "webhook.received" },
];

const SOURCE_FILTERS: { label: string; value: ActivityEventSource | "" }[] = [
  { label: "All sources", value: "" },
  { label: "Dashboard", value: "dashboard" },
  { label: "Webhook", value: "webhook" },
  { label: "Core API", value: "core_api" },
];

const SEVERITY_FILTERS: { label: string; value: ActivityEventSeverity | "" }[] = [
  { label: "All severities", value: "" },
  { label: "Info", value: "info" },
  { label: "Warning", value: "warning" },
  { label: "Error", value: "error" },
  { label: "Critical", value: "critical" },
];

export default function ActivityPage() {
  const [type, setType] = useState<ActivityEventType | "">("");
  const [source, setSource] = useState<ActivityEventSource | "">("");
  const [severity, setSeverity] = useState<ActivityEventSeverity | "">("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");

  const fromIso = useMemo(() => {
    if (!from) return undefined;
    const parsed = new Date(from);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }, [from]);

  const {
    events,
    lastUpdated,
    loading,
    loadingMore,
    hasMore,
    total,
    error,
    loadMore,
  } = useActivityFeed({
    limit: 10,
    type: type || undefined,
    source: source || undefined,
    severity: severity || undefined,
    actor: actor.trim() || undefined,
    from: fromIso,
    autoRefresh: false,
    simulate: false,
  });

  const hasActiveFilters = Boolean(type || source || severity || actor.trim() || from);

  const clearFilters = () => {
    setType("");
    setSource("");
    setSeverity("");
    setActor("");
    setFrom("");
  };

  return (
    <DashboardLayout title="Activity">
      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-sm text-slate-500">
          Showing {events.length} of {total} event{total !== 1 ? "s" : ""}
        </p>
        <LastUpdated date={lastUpdated} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <label className="text-xs font-medium text-slate-600">
            Event type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ActivityEventType | "")}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {TYPE_FILTERS.map((option) => (
                <option key={option.value || "all-types"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600">
            Source
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as ActivityEventSource | "")}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {SOURCE_FILTERS.map((option) => (
                <option key={option.value || "all-sources"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600">
            Severity
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as ActivityEventSeverity | "")}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {SEVERITY_FILTERS.map((option) => (
                <option key={option.value || "all-severities"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600">
            Actor
            <input
              value={actor}
              onChange={(event) => setActor(event.target.value)}
              placeholder="Name or wallet"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="text-xs font-medium text-slate-600">
            From
            <input
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </label>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        {error ? (
          <div className="px-6 py-12 text-center text-red-500 text-sm">{error}</div>
        ) : loading && events.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading activity...</div>
        ) : events.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            {hasActiveFilters ? "No activity matches the selected filters." : "No activity yet."}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {events.map((activity) => (
                <li key={activity.id} className="px-6 py-4 flex items-start gap-4 animate-[fadeIn_0.3s_ease-in]">
                  <div className={`w-10 h-10 rounded-full ${TYPE_COLOR[activity.type as ActivityEventType] || "bg-slate-100"} flex items-center justify-center text-lg shrink-0`}>
                    {TYPE_ICON[activity.type as ActivityEventType] ?? "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800 truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${activity.source === "webhook" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-700"}`}>
                          {activity.source}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${activity.severity === "error" || activity.severity === "critical" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                          {activity.severity}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      by {activity.actor.name || activity.actor.wallet || "System"}
                    </p>
                    {activity.entity && (
                      <p className="text-xs text-slate-400 mt-1">
                        {activity.entity.type}: {activity.entity.name || activity.entity.id}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="px-6 py-4 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
