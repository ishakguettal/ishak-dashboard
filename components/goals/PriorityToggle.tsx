"use client";

import { cn } from "@/lib/utils/cn";
import { type Priority } from "@/lib/constants";

const OPTIONS: { value: Priority; label: string; selected: string }[] = [
  { value: "low", label: "Low", selected: "border-blue-500/40 bg-blue-500/20 text-blue-400" },
  { value: "medium", label: "Medium", selected: "border-amber-500/40 bg-amber-500/20 text-amber-400" },
  { value: "high", label: "High", selected: "border-red-500/40 bg-red-500/20 text-red-400" },
];

/**
 * Inline badge-style priority picker — three pill buttons (Low/Medium/High),
 * controlled. Replaces the native <select> in the task add forms.
 */
export function PriorityToggle({
  value,
  onChange,
  className,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              active
                ? o.selected
                : "border-[#2a2a2a] bg-[#1f1f1f] text-muted hover:border-[#3a3a3a]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
