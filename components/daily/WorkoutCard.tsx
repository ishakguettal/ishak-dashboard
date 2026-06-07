"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { BodyFeeling } from "./BodyFeeling";

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

// Quick override options (Rest first, then the training splits).
const OVERRIDE_TYPES = [
  "rest",
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full_body",
  "cardio",
] as const;

const LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

function daysAgoText(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function WorkoutCard({
  plannedType,
  customName,
  plannedExercises,
  isRestDay,
  sessionExists,
  lastWorkout,
  consecutiveDays,
  lastBackPain,
  overloadHint,
  duration,
  volume,
  onOverride,
}: {
  plannedType: string;
  customName?: string | null;
  plannedExercises?: string[];
  isRestDay: boolean;
  sessionExists: boolean;
  lastWorkout: { type: string | null; daysAgo: number } | null;
  consecutiveDays: number;
  lastBackPain: number | null;
  overloadHint: { name: string; weight: number } | null;
  /** Today's logged session duration (minutes) + total working-set volume (kg). */
  duration?: number | null;
  volume?: number | null;
  /** Persist a manual override of today's workout type. */
  onOverride?: (type: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [optimisticType, setOptimisticType] = useState<string | null>(null);
  const [draft, setDraft] = useState(plannedType);
  const [pending, startTransition] = useTransition();

  // Optimistic override wins over the server-provided type until revalidation.
  const effectiveType = optimisticType ?? plannedType;
  const isRest = optimisticType ? effectiveType === "rest" : isRestDay;
  const typeLabel = optimisticType
    ? titleize(optimisticType)
    : customName || titleize(plannedType);

  const backRough = lastBackPain != null && lastBackPain >= 7;
  const exercises = plannedExercises ?? [];
  const shownExercises = exercises.slice(0, 4);
  const moreExercises = exercises.length - shownExercises.length;

  function togglePicker() {
    if (!pickerOpen) setDraft(effectiveType);
    setPickerOpen((o) => !o);
  }

  function save() {
    setOptimisticType(draft);
    setPickerOpen(false);
    startTransition(() => {
      onOverride?.(draft);
    });
  }

  return (
    <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left */}
        <div className="min-w-0">
          <p className={LABEL}>Today&apos;s workout</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-500">
              {typeLabel}
            </span>
            {onOverride ? (
              <button
                type="button"
                onClick={togglePicker}
                className="text-xs text-muted underline-offset-2 hover:underline"
              >
                Change today
              </button>
            ) : null}
            <span className="text-sm text-muted">
              {MUSCLES[effectiveType] ?? "Training"}
            </span>
          </div>
          {!isRest && shownExercises.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {shownExercises.map((name) => (
                <span
                  key={name}
                  className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-0.5 text-xs text-muted"
                >
                  {name}
                </span>
              ))}
              {moreExercises > 0 ? (
                <span className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-0.5 text-xs text-muted">
                  +{moreExercises} more
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Right */}
        <div className="shrink-0">
          {sessionExists ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-green-400/30 bg-green-400/10 px-4 py-2.5 text-sm font-semibold text-green-400">
              <Check className="size-4" /> Session logged ✓
            </span>
          ) : isRest ? (
            <span className="inline-flex items-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-muted">
              Rest &amp; recover
            </span>
          ) : (
            <Link
              href="/workouts"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Start Session <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Today override picker */}
      {pickerOpen ? (
        <div className="mt-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3">
          <p className={LABEL}>Override today&apos;s type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OVERRIDE_TYPES.map((t) => {
              const active = draft === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraft(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                      : "border-[#2a2a2a] bg-[#1f1f1f] text-muted hover:border-[#3a3a3a]",
                  )}
                >
                  {titleize(t)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="mt-3 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      ) : null}

      {/* Logged session — duration + volume */}
      {sessionExists && (duration != null || (volume != null && volume > 0)) ? (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-green-400/20 bg-green-400/5 px-4 py-2.5 text-sm">
          {duration != null ? (
            <span className="text-muted">
              Duration <span className="font-semibold text-text">{duration} min</span>
            </span>
          ) : null}
          {volume != null && volume > 0 ? (
            <span className="text-muted">
              Volume{" "}
              <span className="font-semibold text-text">
                {volume.toLocaleString("en-US")} kg
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Rest day — quick body-readiness check-in */}
      {isRest ? (
        <div className="mt-4">
          <p className={LABEL}>How&apos;s the body feeling?</p>
          <div className="mt-2">
            <BodyFeeling />
          </div>
        </div>
      ) : null}

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
