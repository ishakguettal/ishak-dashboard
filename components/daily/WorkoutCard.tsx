import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const MUSCLES: Record<string, string> = {
  push: "Chest · Shoulders · Triceps",
  pull: "Back · Biceps · Rear delts",
  legs: "Quads · Hamstrings · Glutes",
  upper: "Chest · Back · Arms",
  lower: "Quads · Hamstrings · Calves",
  full_body: "Full body",
  cardio: "Conditioning",
  rest: "Recovery & mobility",
};

const LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

function daysAgoText(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function WorkoutCard({
  plannedType,
  isRestDay,
  sessionExists,
  lastWorkout,
  consecutiveDays,
  lastBackPain,
  overloadHint,
}: {
  plannedType: string;
  isRestDay: boolean;
  sessionExists: boolean;
  lastWorkout: { type: string | null; daysAgo: number } | null;
  consecutiveDays: number;
  lastBackPain: number | null;
  overloadHint: { name: string; weight: number } | null;
}) {
  const backRough = lastBackPain != null && lastBackPain >= 7;

  return (
    <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left */}
        <div>
          <p className={LABEL}>Today&apos;s workout</p>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-500">
              {titleize(plannedType)}
            </span>
            <span className="text-sm text-muted">
              {MUSCLES[plannedType] ?? "Training"}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="shrink-0">
          {sessionExists ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-green-400/30 bg-green-400/10 px-4 py-2.5 text-sm font-semibold text-green-400">
              <Check className="size-4" /> Logged ✓
            </span>
          ) : isRestDay ? (
            <span className="inline-flex items-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-muted">
              Rest &amp; recover
            </span>
          ) : (
            <Link
              href="/workouts"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Start session <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Bottom stat row */}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#1f1f1f] lg:grid-cols-4">
        <Stat label="Last session">
          {lastWorkout ? (
            <span className="text-sm font-medium text-text">
              {titleize(lastWorkout.type ?? "—")}
              <span className="ml-1 text-muted">· {daysAgoText(lastWorkout.daysAgo)}</span>
            </span>
          ) : (
            <span className="text-sm text-muted">No sessions yet</span>
          )}
        </Stat>

        <Stat label="Consecutive days">
          <span className="text-sm font-medium tabular-nums text-text">
            {consecutiveDays} day{consecutiveDays === 1 ? "" : "s"}
          </span>
        </Stat>

        <Stat label="Back last session">
          {lastBackPain != null ? (
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                backRough ? "text-red-400" : "text-text",
              )}
            >
              {lastBackPain}/10
              {backRough ? (
                <span className="ml-1 text-xs font-normal">· warm up carefully</span>
              ) : null}
            </span>
          ) : (
            <span className="text-sm text-muted">—</span>
          )}
        </Stat>

        <Stat label="Overload">
          {overloadHint ? (
            <span className="text-sm font-medium text-green-400">
              {overloadHint.name}
              <span className="ml-1 font-normal">→ {overloadHint.weight}kg</span>
            </span>
          ) : (
            <span className="text-sm text-muted">Hold steady</span>
          )}
        </Stat>
      </div>
    </section>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#141414] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
