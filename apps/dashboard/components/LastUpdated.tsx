"use client";

import { useEffect, useState } from "react";

interface LastUpdatedProps {
  date: Date | null;
  className?: string;
  /** When true, shows "Auto-refresh on" indicator alongside the timestamp. */
  autoRefresh?: boolean;
}

/** Displays a human-readable "Last updated X s/m ago" label, refreshing every 10 s. */
export default function LastUpdated({ date, className = "", autoRefresh = false }: LastUpdatedProps) {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    if (!date) return;

    const update = () => {
      const secs = Math.floor((Date.now() - date.getTime()) / 1000);
      if (secs < 5)  { setLabel("just now"); return; }
      if (secs < 60) { setLabel(`${secs}s ago`); return; }
      const mins = Math.floor(secs / 60);
      if (mins < 60) { setLabel(`${mins}m ago`); return; }
      const hours = Math.floor(mins / 60);
      setLabel(`${hours}h ago`);
    };

    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [date]);

  if (!date) return null;

  return (
    <span className={`text-xs text-slate-400 flex items-center gap-2 ${className}`}>
      {/* pulsing dot signals live updates */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span>Updated {label}</span>
      {autoRefresh && (
        <span className="text-[10px] text-slate-300 border border-slate-200 rounded px-1.5 py-0.5">
          auto
        </span>
      )}
    </span>
  );
}
