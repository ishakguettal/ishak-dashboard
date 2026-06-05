"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { setDeload } from "@/app/(app)/workouts/actions";

export function DeloadControl({
  active,
  percentage,
}: {
  active: boolean;
  percentage: number;
}) {
  const [, startTransition] = useTransition();
  const [on, setOn] = useState(active);
  const [pct, setPct] = useState(percentage || 60);

  function save(nextOn: boolean, nextPct: number) {
    startTransition(async () => {
      const fd = new FormData();
      if (nextOn) fd.set("deload_active", "on");
      fd.set("deload_percentage", String(nextPct));
      await setDeload(fd);
    });
  }

  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Deload week</p>
          <p className="text-xs text-muted">
            Auto-reduce working weights to recover.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !on;
            setOn(next);
            save(next, pct);
          }}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            on ? "bg-amber-500" : "bg-[#2a2a2a]",
          )}
          aria-pressed={on}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-black transition-all",
              on ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
      </div>

      <div className={cn("mt-3", on ? "" : "opacity-50")}>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Working weight</span>
          <span className="font-semibold tabular-nums text-text">{pct}%</span>
        </div>
        <input
          type="range"
          min={40}
          max={90}
          step={5}
          value={pct}
          disabled={!on}
          onChange={(e) => setPct(Number(e.target.value))}
          onMouseUp={() => save(on, pct)}
          onTouchEnd={() => save(on, pct)}
          className="mt-1 w-full accent-amber-500"
        />
      </div>
    </div>
  );
}
