"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  updateWeeklyTarget,
  deleteWeeklyTarget,
} from "@/app/(app)/goals/actions";

type WT = {
  id: string;
  title: string;
  unit: string | null;
  target_value: number | null;
  current_value: number;
};

type Act =
  | { kind: "remove"; id: string }
  | { kind: "value"; id: string; value: number };

function reducer(state: WT[], a: Act): WT[] {
  switch (a.kind) {
    case "remove":
      return state.filter((t) => t.id !== a.id);
    case "value":
      return state.map((t) =>
        t.id === a.id ? { ...t, current_value: a.value } : t,
      );
  }
}

export function WeeklyTargets({ initialTargets }: { initialTargets: WT[] }) {
  const [items, dispatch] = useOptimistic(initialTargets, reducer);
  const [, startTransition] = useTransition();
  const [flashId, setFlashId] = useState<string | null>(null);

  function onCommit(t: WT, raw: string) {
    const value = Math.max(0, Number(raw));
    if (!Number.isFinite(value) || value === t.current_value) return;
    startTransition(async () => {
      dispatch({ kind: "value", id: t.id, value });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("current_value", String(value));
      await updateWeeklyTarget(fd);
    });
    setFlashId(t.id);
    setTimeout(() => setFlashId((cur) => (cur === t.id ? null : cur)), 900);
  }

  function onDelete(t: WT) {
    startTransition(async () => {
      dispatch({ kind: "remove", id: t.id });
      const fd = new FormData();
      fd.set("id", t.id);
      await deleteWeeklyTarget(fd);
    });
  }

  if (items.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-muted">
        No targets this week — track a weekly metric.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((t) => {
        const pct = t.target_value
          ? Math.min(100, (t.current_value / t.target_value) * 100)
          : 0;
        const flashing = flashId === t.id;
        return (
          <div
            key={t.id}
            className="group rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-text">{t.title}</p>
              <button
                type="button"
                onClick={() => onDelete(t)}
                title="Delete"
                aria-label="Delete target"
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted opacity-0 transition-all hover:bg-[#1f1f1f] hover:text-red-400 group-hover:opacity-100 [@media(hover:none)]:opacity-100 sm:size-8"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div
                className={cn(
                  "h-2 flex-1 overflow-hidden rounded-full bg-[#1f1f1f] transition-shadow duration-300",
                  flashing && "ring-1 ring-green-400/70",
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    flashing ? "bg-green-400" : "bg-amber-500",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  defaultValue={t.current_value}
                  onBlur={(e) => onCommit(t, e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  className="h-10 w-16 rounded-lg border border-[#272727] bg-[#0f0f0f] px-2 text-sm tabular-nums text-text focus:border-amber-500 focus:outline-none"
                />
                <span className="whitespace-nowrap text-xs text-muted">
                  / {t.target_value ?? "—"} {t.unit}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
