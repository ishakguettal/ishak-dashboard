"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const OPTIONS = [
  { value: "good", emoji: "😌", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "tight", emoji: "😤", label: "Tight" },
] as const;

type Feeling = (typeof OPTIONS)[number]["value"];

/**
 * Rest-day "how's the body feeling?" quick-tap.
 *
 * NOTE: there's no existing table that cleanly fits a rest-day body-readiness
 * check-in (daily_logs is for reflection, workout_sessions would need a fake
 * session row), and this task must not add server actions or schema. So for now
 * this is a UI affordance only — the selection is logged to the console and held
 * in local state. Wire it to a table later if one is added.
 */
export function BodyFeeling() {
  const [picked, setPicked] = useState<Feeling | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => {
        const active = picked === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              setPicked(o.value);
              console.log("[body-feeling]", o.value);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-amber-500/50 bg-amber-500/15 text-amber-500"
                : "border-[#2a2a2a] bg-[#1a1a1a] text-muted hover:border-[#3a3a3a]",
            )}
          >
            <span aria-hidden>{o.emoji}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
