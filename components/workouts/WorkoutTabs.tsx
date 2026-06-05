"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { id: "today", label: "Today" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

export function WorkoutTabs({ active }: { active: string }) {
  return (
    <div className="flex gap-5 border-b border-[#1e1e1e]">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={`/workouts?tab=${t.id}`}
          scroll={false}
          className={cn(
            "-mb-px border-b-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
            active === t.id
              ? "border-amber-500 text-amber-500"
              : "border-transparent text-muted hover:text-text",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
