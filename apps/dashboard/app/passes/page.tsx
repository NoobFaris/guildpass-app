"use client";

/**
 * app/passes/page.tsx
 *
 * Passes management page.
 *
 * Visibility rules:
 *  - Table (read) — visible to ALL roles (passes:read).
 *  - "Create Pass" button — visible only when canManagePasses() is true (passes:write).
 *  - "Edit" / "Deactivate" row actions — same guard.
 *
 * Note: The actual mutation handlers (form submissions, API calls) must also
 * enforce permissions server-side via assertPermission. UI hiding is convenience
 * only and must not be the sole security boundary.
 */

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import UnsupportedBanner from "@/components/UnsupportedBanner";
import { mockPasses, type Pass as MockPass } from "@/lib/mock-data";
import { useSession } from "@/lib/hooks/useSession";
import { canManagePasses } from "@/lib/permissions";
import { useEffect, useState, useRef } from "react";
import { useOptimisticMutation } from "@/lib/hooks/useOptimisticMutation";
import { fetchList } from "@/lib/fetch-list";
import { getClientApiMode } from "@/lib/client-env";

export default function PassesPage() {
  const session = useSession();
  const canWrite = canManagePasses(session);
  const [passes, setPasses] = useState<MockPass[]>(mockPasses);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [listState, setListState] = useState<"loading" | "loaded" | "unsupported" | "error">("loading");
  const previousPassesRef = useRef<MockPass[]>(passes);
  const apiMode = getClientApiMode();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({
       name: "",
      description: "",
      price: "",
      maxSupply: "",
           });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setListState("loading");

      const result = await fetchList<MockPass>("/api/passes");

      if (!mounted) return;

      if (result.ok) {
        setPasses(result.data);
        previousPassesRef.current = result.data;
        setListState("loaded");
      } else if (result.code === "UNSUPPORTED_IN_LIVE_MODE") {
        setListState("unsupported");
      } else if (apiMode === "live") {
        // Network/server error in live mode — show error state
        setListState("error");
      } else {
        // Mock/dev mode — fall back to mock data
        console.warn("[PassesPage] Fetch failed, using mock data:", result.message);
        setListState("loaded");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [apiMode]);

  const updateMutation = useOptimisticMutation<MockPass, { id: string; data: Partial<MockPass> }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/passes?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update pass");
      }
      return res.json();
    },
    onOptimisticUpdate: ({ id, data }) => {
      previousPassesRef.current = passes;
      setPasses((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
      setPendingIds((prev) => new Set(prev).add(id));
    },
    onRollback: (_error, { id }) => {
      setPasses(previousPassesRef.current);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onSuccess: (updatedPass, { id }) => {
      setPasses((prev) =>
        prev.map((p) => (p.id === id ? updatedPass : p))
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

  const handleDeactivate = (id: string) => {
    updateMutation.mutate({ id, data: { status: "inactive" } });
  };

  const handleEdit = (id: string) => {
    const name = prompt("Enter new name:");
    if (name) {
      updateMutation.mutate({ id, data: { name } });
    }
  };

  

  return (
    <DashboardLayout title="Passes" session={session}>
      {/* ── Unsupported banner (live mode) ──────────────────────────────── */}
      {listState === "unsupported" && (
        <UnsupportedBanner resource="passes" />
      )}

      {/* ── Error banner (live mode network error) ─────────────────────── */}
      {listState === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-4">
          <p className="text-sm text-red-700">
            Failed to load passes from the server. Check your API configuration and try again.
          </p>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          {listState === "unsupported"
            ? "Pass listing unavailable in live mode"
            : `${passes.length} pass${passes.length !== 1 ? "es" : ""} total`}
        </p>

        {/* Create button — write roles only */}
        {canWrite && (
         <button
          id="btn-create-pass"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
            <span>＋</span> Create Pass
          </button>
        )}
      </div>

      {isCreateOpen && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
    <div className="bg-white p-6 rounded-xl w-[400px] space-y-3">

      <h2 className="text-lg font-semibold">Create Pass</h2>

      <input
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Price"
        value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <input
        placeholder="Max Supply"
        value={form.maxSupply}
        onChange={(e) => setForm({ ...form, maxSupply: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <div className="flex justify-end gap-2">
        <button onClick={() => setIsCreateOpen(false)}>
          Cancel
        </button>

        <button
          disabled={createLoading}
          onClick={async () => {
            if (!form.name.trim()) {
            alert("Pass name is required.");
            return;
              }

              if (!form.description.trim()) {
              alert("Description is required.");
              return;
               }

             try {
              setCreateLoading(true);

           const res = await fetch("/api/passes", {
             method: "POST",
             headers: {
              "Content-Type": "application/json",
                  },
          body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: form.price ? Number(form.price) : undefined,
          maxSupply: form.maxSupply
          ? Number(form.maxSupply)
          : undefined,
      }),
    });

        if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || "Failed to create pass");
      }

       const newPass = await res.json();

        setPasses((prev) => [newPass, ...prev]);
        setIsCreateOpen(false);

       setForm({
         name: "",
        description: "",
        price: "",
        maxSupply: "",
         });
      } catch (e: any) {
      alert(e.message);
    } finally {
    setCreateLoading(false);
  }
}}
        >
          {createLoading ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* ── Passes table ────────────────────────────────────────────────── */}
      {listState !== "unsupported" && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Description</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Price</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Supply</th>
                {/* Actions column only rendered for write-capable roles */}
                {canWrite && (
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {passes.map((pass) => {
                const isPending = pendingIds.has(pass.id);
                return (
                  <tr key={pass.id} className={`hover:bg-slate-50 transition-opacity ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {pass.name}
                      {isPending && <span className="ml-2 text-xs text-slate-400 animate-pulse">(updating...)</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{pass.description}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={pass.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {pass.price !== undefined ? `${pass.price} ETH` : "Free"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {pass.currentSupply} / {pass.maxSupply ?? "∞"}
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-edit-pass-${pass.id}`}
                            onClick={() => handleEdit(pass.id)}
                            disabled={isPending}
                            className="text-xs text-slate-600 hover:text-violet-600 font-medium transition-colors disabled:opacity-50"
                            title={`Edit ${pass.name}`}
                          >
                            Edit
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            id={`btn-deactivate-pass-${pass.id}`}
                            onClick={() => handleDeactivate(pass.id)}
                            disabled={isPending || pass.status === "inactive"}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                            title={`Deactivate ${pass.name}`}
                          >
                            Deactivate
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
