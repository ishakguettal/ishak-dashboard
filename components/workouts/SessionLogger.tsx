"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  Trash2,
  Repeat,
  Timer,
  TriangleAlert,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  addSet,
  deleteSet,
  finishSession,
  swapScheduleExercise,
} from "@/app/(app)/workouts/actions";

export type LoggerExercise = {
  scheduleExId: string;
  exerciseId: string;
  name: string;
  muscle: string | null;
  targetSets: number;
  repMin: number;
  repMax: number;
  weightIncrement: number;
  backSensitive: boolean;
  supersetWith: string | null;
  prefillWeight: number | null;
  lastSummary: string | null;
  loggedSets: {
    id: string;
    set_number: number;
    reps: number | null;
    weight: number | null;
  }[];
};

const TONE = {
  success: "border-green-400/40 bg-green-400/10 text-green-400",
  info: "border-[#2a2a2a] bg-[#1a1a1a] text-muted",
  warning: "border-red-400/40 bg-red-400/10 text-red-400",
} as const;

function liveOverload(ex: LoggerExercise): {
  label: string;
  tone: keyof typeof TONE;
} {
  const working = ex.loggedSets.filter((s) => (s.reps ?? 0) > 0);
  if (working.length === 0) return { label: "Logging…", tone: "info" };
  const allTop = working.every((s) => (s.reps ?? 0) >= ex.repMax);
  if (allTop && working.length >= ex.targetSets && !ex.backSensitive) {
    const top = Math.max(...working.map((s) => Number(s.weight ?? 0)));
    return {
      label: `+${ex.weightIncrement}kg next → ${top + ex.weightIncrement}kg`,
      tone: "success",
    };
  }
  if (ex.backSensitive) return { label: "Back-sensitive — hold", tone: "warning" };
  return { label: "Keep pushing reps", tone: "info" };
}

function RestTimer({ since }: { since: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (since == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  if (since == null) return null;
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(1, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <div className="sticky top-2 z-10 mb-3 flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-sm font-semibold text-amber-500">
      <Timer className="size-4" /> Rest {mm}:{ss}
    </div>
  );
}

export function SessionLogger({
  sessionId,
  exercises,
  library,
  deloadActive,
  deloadPct,
}: {
  sessionId: string;
  exercises: LoggerExercise[];
  library: { id: string; name: string; muscle: string | null }[];
  deloadActive: boolean;
  deloadPct: number;
}) {
  const [, startTransition] = useTransition();
  const [restSince, setRestSince] = useState<number | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Per-exercise input drafts + notes.
  const initial: Record<string, { weight: string; reps: string }> = {};
  for (const ex of exercises) {
    const base =
      deloadActive && ex.prefillWeight
        ? Math.round((ex.prefillWeight * deloadPct) / 100 / 0.5) * 0.5
        : ex.prefillWeight;
    initial[ex.exerciseId] = { weight: base != null ? String(base) : "", reps: "" };
  }
  const [draft, setDraft] = useState(initial);
  const notesRef = useRef<Record<string, string>>({});

  function setDraftField(exId: string, field: "weight" | "reps", v: string) {
    setDraft((d) => ({ ...d, [exId]: { ...d[exId], [field]: v } }));
  }

  function logSet(ex: LoggerExercise) {
    const d = draft[ex.exerciseId];
    if (!d || (!d.weight && !d.reps)) return;
    startTransition(async () => {
      setRestSince(Date.now());
      const fd = new FormData();
      fd.set("session_id", sessionId);
      fd.set("exercise_id", ex.exerciseId);
      fd.set("weight", d.weight);
      fd.set("reps", d.reps);
      await addSet(fd);
      setDraft((cur) => ({
        ...cur,
        [ex.exerciseId]: { weight: d.weight, reps: "" },
      }));
    });
  }

  function removeSet(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteSet(fd);
    });
  }

  function doSwap(scheduleExId: string, exerciseId: string) {
    setSwapFor(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", scheduleExId);
      fd.set("exercise_id", exerciseId);
      await swapScheduleExercise(fd);
    });
  }

  return (
    <div className="space-y-4">
      <RestTimer since={restSince} />

      {deloadActive ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          <TriangleAlert className="size-4" /> Deload active — weights reduced to{" "}
          {deloadPct}%.
        </div>
      ) : null}

      {exercises.length === 0 ? (
        <p className="rounded-lg border border-[#1e1e1e] bg-[#141414] p-4 text-sm text-muted">
          No exercises planned for today. Add some in Settings, or log freely
          below by swapping.
        </p>
      ) : null}

      {exercises.map((ex) => {
        const ov = liveOverload(ex);
        const sameMuscle = library.filter(
          (l) => l.muscle === ex.muscle && l.id !== ex.exerciseId,
        );
        return (
          <div
            key={ex.scheduleExId}
            className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{ex.name}</span>
                  {ex.backSensitive ? (
                    <span className="rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[10px] text-red-400">
                      back-sensitive
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted">
                  {ex.muscle ? `${ex.muscle} · ` : ""}
                  {ex.targetSets} × {ex.repMin}–{ex.repMax}
                  {ex.lastSummary ? ` · last: ${ex.lastSummary}` : ""}
                </p>
                {ex.supersetWith ? (
                  <p className="mt-0.5 text-xs text-amber-500">
                    Superset with {ex.supersetWith}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  setSwapFor((c) => (c === ex.scheduleExId ? null : ex.scheduleExId))
                }
                title="Swap exercise"
                className="rounded-md p-1.5 text-muted hover:bg-[#1f1f1f] hover:text-text"
              >
                <Repeat className="size-4" />
              </button>
            </div>

            {swapFor === ex.scheduleExId ? (
              <div className="mt-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">
                  Swap to ({ex.muscle ?? "any"})
                </p>
                {sameMuscle.length === 0 ? (
                  <p className="text-xs text-muted">No other {ex.muscle} lifts.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {sameMuscle.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => doSwap(ex.scheduleExId, l.id)}
                        className="rounded-md border border-[#2a2a2a] bg-[#141414] px-2 py-1 text-xs hover:border-amber-500"
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Logged sets */}
            {ex.loggedSets.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {ex.loggedSets.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-xs text-muted">#{s.set_number}</span>
                    <span className="tabular-nums">
                      {s.weight ?? "—"}kg × {s.reps ?? "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSet(s.id)}
                      className="ml-auto rounded p-1 text-muted hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Add set */}
            <div className="mt-3 flex items-end gap-2">
              <label className="flex-1">
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  Weight
                </span>
                <input
                  inputMode="decimal"
                  value={draft[ex.exerciseId]?.weight ?? ""}
                  onChange={(e) => setDraftField(ex.exerciseId, "weight", e.target.value)}
                  className="mt-0.5 h-10 w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2 text-sm tabular-nums focus:border-amber-500 focus:outline-none"
                />
              </label>
              <label className="flex-1">
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  Reps
                </span>
                <input
                  inputMode="numeric"
                  value={draft[ex.exerciseId]?.reps ?? ""}
                  onChange={(e) => setDraftField(ex.exerciseId, "reps", e.target.value)}
                  className="mt-0.5 h-10 w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2 text-sm tabular-nums focus:border-amber-500 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => logSet(ex)}
                className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black hover:bg-amber-400"
              >
                Log
              </button>
            </div>

            {/* Live overload + notes */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                  TONE[ov.tone],
                )}
              >
                {ov.label}
              </span>
              <input
                placeholder="Notes…"
                defaultValue=""
                onChange={(e) => {
                  notesRef.current[ex.name] = e.target.value;
                }}
                className="min-w-0 flex-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-1.5 text-xs placeholder:text-muted/60 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        );
      })}

      {/* Finish */}
      {!finishing ? (
        <button
          type="button"
          onClick={() => setFinishing(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-black hover:bg-amber-400"
        >
          <Flag className="size-4" /> Finish session
        </button>
      ) : (
        <FinishPanel
          sessionId={sessionId}
          notesRef={notesRef}
          onCancel={() => setFinishing(false)}
        />
      )}
    </div>
  );
}

function FinishPanel({
  sessionId,
  notesRef,
  onCancel,
}: {
  sessionId: string;
  notesRef: React.MutableRefObject<Record<string, string>>;
  onCancel: () => void;
}) {
  const [, startTransition] = useTransition();
  const [back, setBack] = useState(4);
  const [energy, setEnergy] = useState(7);
  const [notes, setNotes] = useState("");

  function confirm() {
    startTransition(async () => {
      const exerciseNotes = Object.entries(notesRef.current)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}: ${v.trim()}`)
        .join(" | ");
      const combined = [notes.trim(), exerciseNotes].filter(Boolean).join(" — ");
      const fd = new FormData();
      fd.set("id", sessionId);
      fd.set("back_pain", String(back));
      fd.set("energy", String(energy));
      fd.set("notes", combined);
      await finishSession(fd);
    });
  }

  return (
    <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4">
      <p className="mb-3 text-sm font-semibold">Finish session</p>
      <Slider label="Back pain" value={back} onChange={setBack} tone="back" />
      <Slider label="Energy" value={energy} onChange={setEnergy} tone="energy" />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Session notes…"
        className="mt-2 min-h-16 w-full resize-y rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-1.5 text-sm placeholder:text-muted/60 focus:border-amber-500 focus:outline-none"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={confirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          <Check className="size-4" /> Complete
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#2a2a2a] px-4 text-sm text-muted hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tone: "back" | "energy";
}) {
  const color =
    tone === "back"
      ? value >= 7
        ? "text-red-400"
        : value >= 4
          ? "text-amber-500"
          : "text-green-400"
      : "text-blue-400";
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className={cn("font-semibold tabular-nums", color)}>{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-full",
          tone === "back" ? "accent-amber-500" : "accent-blue-400",
        )}
      />
    </div>
  );
}
