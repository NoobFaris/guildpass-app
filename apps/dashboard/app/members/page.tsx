"use client";

/**
 * app/members/page.tsx
 *
 * Members management page.
 *
 * Visibility rules:
 *  - Table (read) — visible to ALL roles (members:read).
 *  - "Invite Member" button — visible only when canManageMembers() is true (members:write).
 *  - "Remove" / "Change Role" row actions — same guard.
 *
 * Note: Mutation handlers must enforce permissions server-side via
 * assertPermission. UI hiding is convenience only.
 */

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import RoleEditor from "@/components/RoleEditor";
import UnsupportedBanner from "@/components/UnsupportedBanner";
import { mockMembers, type Member as MockMember } from "@/lib/mock-data";
import { useSession } from "@/lib/hooks/useSession";
import { canManageMembers } from "@/lib/permissions";
import { useEffect, useState, useRef } from "react";
import { useOptimisticMutation } from "@/lib/hooks/useOptimisticMutation";
import { readApiResult } from "@/lib/api-client";

export default function MembersPage() {
  const session = useSession();
  const canWrite = canManageMembers(session);
  const [members, setMembers] = useState<MockMember[]>(mockMembers);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [listState, setListState] = useState<"loading" | "loaded" | "unsupported" | "error">("loading");
  const previousMembersRef = useRef<MockMember[]>(members);
  const apiMode = getClientApiMode();

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);

    const [form, setForm] = useState({
    name: "",
    wallet: "",
});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/members");
        const data = await readApiResult<MockMember[]>(res);
        if (mounted) {
          setMembers(data);
          previousMembersRef.current = data;
        }
      } catch (err) {
        // fallback to mockMembers (already the default)
        console.warn("Falling back to mock members:", err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [apiMode]);

  const updateMutation = useOptimisticMutation<MockMember, { id: string; data: Partial<MockMember> }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/members?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return readApiResult<MockMember>(res);
    },
    onOptimisticUpdate: ({ id, data }) => {
      previousMembersRef.current = members;
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...data } : m))
      );
      setPendingIds((prev) => new Set(prev).add(id));
    },
    onRollback: (_error, { id }) => {
      setMembers(previousMembersRef.current);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onSuccess: (updatedMember, { id }) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? updatedMember : m))
      );
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const deleteMutation = useOptimisticMutation<{ success: boolean }, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/members?id=${id}`, {
        method: "DELETE",
      });
      return readApiResult<{ success: boolean }>(res);
    },
    onOptimisticUpdate: (id) => {
      previousMembersRef.current = members;
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setPendingIds((prev) => new Set(prev).add(id));
    },
    onRollback: () => {
      setMembers(previousMembersRef.current);
      setPendingIds(new Set()); // Reset all pending since we restore full state
    },
    onSuccess: (_data, id) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleRemove = (id: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      deleteMutation.mutate(id);
    }
  };

  // Roles are edited inline through the RoleEditor (removable chips + a select
  // of supported roles), which can only ever produce a valid, de-duplicated
  // list. The API route re-validates server-side before persisting.
  const handleRolesChange = (id: string, roles: string[]) => {
    updateMutation.mutate({ id, data: { roles } });
  };

  return (
    <DashboardLayout title="Members" session={session}>
      {/* ── Unsupported banner (live mode) ──────────────────────────────── */}
      {listState === "unsupported" && (
        <UnsupportedBanner resource="members" />
      )}

      {/* ── Error banner (live mode network error) ─────────────────────── */}
      {listState === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-4">
          <p className="text-sm text-red-700">
            Failed to load members from the server. Check your API configuration and try again.
          </p>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          {listState === "unsupported"
            ? "Member listing unavailable in live mode"
            : `${members.length} member${members.length !== 1 ? "s" : ""} total`}
        </p>

        {/* Invite button — write roles only */}
        {canWrite && listState !== "unsupported" && (
          <button
               id="btn-invite-member"
               onClick={() => setIsInviteOpen(true)}
               className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
               >
            <span>＋</span> Invite Member
          </button>
        )}
      </div>

      {isInviteOpen && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
    <div className="bg-white p-6 rounded-xl w-[400px] space-y-3">

      <h2 className="text-lg font-semibold">Invite Member</h2>

      <input
        placeholder="Name"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Wallet"
        value={form.wallet}
        onChange={(e) =>
          setForm({ ...form, wallet: e.target.value })
        }
        className="w-full border p-2 rounded"
      />

      <div className="flex justify-end gap-2">
        <button onClick={() => setIsInviteOpen(false)}>
          Cancel
        </button>

        <button
  disabled={inviteLoading}
  onClick={async () => {
    try {
      if (!form.name.trim()) {
        alert("Name is required");
        return;
      }

      if (!form.wallet.trim()) {
        alert("Wallet is required");
        return;
      }

      setInviteLoading(true);

      const res = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          wallet: form.wallet,
        }),
      });

      const newMember = await readApiResult<MockMember>(res);

// Fallback safety (prevents roles/status undefined bugs)
const safeMember = {
  ...newMember,
  roles: newMember.roles ?? [],
  status: newMember.status ?? "pending",
};

setMembers((prev) => [safeMember, ...prev]);

      setIsInviteOpen(false);

      setForm({
        name: "",
        wallet: "",
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setInviteLoading(false);
    }
  }}
>
  {inviteLoading ? "Inviting..." : "Invite"}
</button>
      </div>

    </div>
  </div>
)}

      {/* ── Members table ───────────────────────────────────────────────── */}
      {listState !== "unsupported" && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Wallet</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Roles</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Last Active</th>
                {/* Actions column only rendered for write-capable roles */}
                {canWrite && (
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const isPending = pendingIds.has(member.id);
                return (
                  <tr key={member.id} className={`hover:bg-slate-50 transition-opacity ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {member.name}
                      {isPending && <span className="ml-2 text-xs text-slate-400 animate-pulse">(updating...)</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">
                      {member.wallet.slice(0, 6)}...{member.wallet.slice(-4)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <RoleEditor
                        roles={member.roles ?? []}
                        disabled={!canWrite || isPending}
                        onChange={(roles) => handleRolesChange(member.id, roles)}
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(member.lastActive).toLocaleDateString()}
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-remove-member-${member.id}`}
                            onClick={() => handleRemove(member.id)}
                            disabled={isPending}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                            title={`Remove ${member.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </DashboardLayout>
  );
}
