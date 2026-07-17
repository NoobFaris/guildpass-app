"use client";

import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import LastUpdated from "@/components/LastUpdated";
import UnsupportedBanner from "@/components/UnsupportedBanner";
import { useActivityFeed } from "@/lib/hooks/useActivityFeed";
import { mockPasses, mockGuilds, mockMembers, type Member as MockMember } from "@/lib/mock-data";
import { readApiResult } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { fetchList } from "@/lib/fetch-list";
import { getClientApiMode } from "@/lib/client-env";

type UnsupportedResource = "passes" | "guilds" | "members";

export default function DashboardPage() {
  const { events, lastUpdated } = useActivityFeed({ limit: 5 });

  const [passesCount, setPassesCount] = useState<number>(mockPasses.length);
  const [guildsCount, setGuildsCount] = useState<number>(mockGuilds.length);
  const [activeMembersCount, setActiveMembersCount] = useState<number>(
    mockMembers.filter((m) => m.status === "active").length
  );
  const [unsupportedResources, setUnsupportedResources] = useState<
    UnsupportedResource[]
  >([]);
  const [hasError, setHasError] = useState(false);

  const apiMode = getClientApiMode();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [passesRes, guildsRes, membersRes] = await Promise.all([
          fetch('/api/passes'),
          fetch('/api/guilds'),
          fetch('/api/members'),
        ]);

        if (mounted) {
          const [passes, guilds, members] = await Promise.all([
            readApiResult<typeof mockPasses>(passesRes),
            readApiResult<typeof mockGuilds>(guildsRes),
            readApiResult<MockMember[]>(membersRes),
          ]);

          setPassesCount(passes.length);
          setGuildsCount(guilds.length);
          setActiveMembersCount(members.filter((mm) => mm.status === 'active').length);
        }
      } catch (err) {
        console.warn('Dashboard stats fetch failed, using mock counts', err);
      }

      // ── Members ─────────────────────────────────────────────
      if (membersResult.ok) {
        const members = membersResult.data as MockMember[];
        setActiveMembersCount(
          members.filter((m) => m.status === "active").length
        );
      } else if (membersResult.code === "UNSUPPORTED_IN_LIVE_MODE") {
        unsupported.push("members");
      } else if (apiMode === "live") {
        encounteredError = true;
      }

      setUnsupportedResources(unsupported);
      setHasError(encounteredError);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [apiMode]);

  const allUnsupported =
    unsupportedResources.length === 3 ||
    (unsupportedResources.length > 0 &&
      ["passes", "guilds", "members"].every((r) =>
        unsupportedResources.includes(r as UnsupportedResource)
      ));

  return (
    <DashboardLayout title="Dashboard">
      {/* ── Unsupported banner (live mode, no list endpoints) ──── */}
      {allUnsupported && (
        <UnsupportedBanner
          resource="dashboard"
          message="The live integration does not support full listing of passes, guilds, or members. Dashboard stats cannot be fetched from the live API."
        />
      )}

      {!allUnsupported && unsupportedResources.length > 0 && (
        <UnsupportedBanner
          resource={unsupportedResources.join(", ")}
          message={`The following data sources are unavailable in live mode: ${unsupportedResources.join(", ")}.`}
        />
      )}

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-4">
          <p className="text-sm text-red-700">
            Some dashboard stats failed to load. Check the API configuration.
          </p>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Passes"    value={passesCount}   icon="🎫" trend="+2 this week" />
        <StatCard title="Active Guilds"   value={guildsCount}  icon="🏰" trend="+1 this week" />
        <StatCard title="Active Members"  value={activeMembersCount} icon="👥" trend="+12 this week" />
        <StatCard title="Total Activity"  value={events.length} icon="📋" trend="live" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Live recent activity ────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Recent Activity</h2>
            <LastUpdated date={lastUpdated} />
          </div>
          {unsupportedResources.includes("passes") ? (
            <div className="text-center py-8 text-sm text-amber-600">
              Activity is tracked via webhooks and is independent of list endpoints.
            </div>
          ) : (
            <ul className="space-y-4">
              {events.slice(0, 5).map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-start gap-4 border-b border-slate-100 pb-3 last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 truncate">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Recent passes (static) ──────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Recent Passes</h2>
          {unsupportedResources.includes("passes") ? (
            <div className="text-center py-8 text-sm text-amber-600">
              Pass listing is not available in live mode.
            </div>
          ) : (
            <ul className="space-y-3">
              {mockPasses.slice(0, 4).map((pass) => (
                <li key={pass.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{pass.name}</p>
                    <p className="text-sm text-slate-500">{pass.currentSupply} / {pass.maxSupply ?? "∞"}</p>
                  </div>
                  <StatusBadge status={pass.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
