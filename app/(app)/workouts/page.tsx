import Link from "next/link";
import {
  Dumbbell,
  BedDouble,
  Plus,
  Check,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Field, Input } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkoutTabs } from "@/components/workouts/WorkoutTabs";
import {
  SessionLogger,
  type LoggerExercise,
} from "@/components/workouts/SessionLogger";
import { HistoryList } from "@/components/workouts/HistoryList";
import {
  SplitBuilder,
  type SplitDay,
  type SplitExercise,
} from "@/components/workouts/SplitBuilder";
import { DeloadControl } from "@/components/workouts/DeloadControl";
import { todayISO, weekdayOf, addDaysISO } from "@/lib/utils/date";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { suggestOverload } from "@/lib/utils/overload";
import {
  startSession,
  reopenSession,
  deleteSession,
  addExercise,
  updateExercise,
  deleteExercise,
} from "./actions";
import { logBackPain } from "@/app/(app)/actions";

export const dynamic = "force-dynamic";

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

type EmbeddedExercise = {
  name: string;
  muscle_group: string | null;
  weight_increment: number;
  is_back_sensitive: boolean;
  target_rep_min: number;
  target_rep_max: number;
};

type SchedEx = {
  id: string;
  schedule_id: string;
  exercise_id: string | null;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  sort_order: number;
  superset_group: string | null;
  is_back_sensitive: boolean;
  exercises: EmbeddedExercise | null;
};

type Session = {
  id: string;
  session_date: string;
  workout_type: string | null;
  back_pain: number | null;
  energy: number | null;
  duration_min: number | null;
  notes: string | null;
  completed: boolean;
};

type SetRow = {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  set_number: number;
  reps: number | null;
  weight: number | null;
  is_warmup: boolean;
};

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "today" } = await searchParams;
  const supabase = await createClient();
  const today = todayISO();
  const weekday = weekdayOf(today);

  const [profileRes, scheduleRes, exercisesRes, schedExRes, sessionsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("deload_active,deload_percentage")
        .maybeSingle(),
      supabase
        .from("workout_schedule")
        .select("id,weekday,workout_type,custom_name")
        .order("weekday"),
      supabase.from("exercises").select("*").order("name"),
      supabase
        .from("schedule_exercises")
        .select(
          "id,schedule_id,exercise_id,target_sets,target_rep_min,target_rep_max,sort_order,superset_group,is_back_sensitive,exercises(name,muscle_group,weight_increment,is_back_sensitive,target_rep_min,target_rep_max)",
        )
        .order("sort_order"),
      supabase
        .from("workout_sessions")
        .select("*")
        .order("session_date", { ascending: false })
        .limit(40),
    ]);

  const profile = (profileRes.data ?? {}) as {
    deload_active?: boolean;
    deload_percentage?: number;
  };
  const deloadActive = !!profile.deload_active;
  const deloadPct = profile.deload_percentage ?? 60;

  const scheduleRows = (scheduleRes.data ?? []) as {
    id: string;
    weekday: number;
    workout_type: string;
    custom_name: string | null;
  }[];
  const exercises = (exercisesRes.data ?? []) as {
    id: string;
    name: string;
    muscle_group: string | null;
    equipment: string | null;
    target_rep_min: number;
    target_rep_max: number;
    weight_increment: number;
    is_back_sensitive: boolean;
  }[];
  const schedEx = (schedExRes.data ?? []) as unknown as SchedEx[];
  const sessions = (sessionsRes.data ?? []) as Session[];

  const sessionIds = sessions.map((s) => s.id);
  const setsRes = sessionIds.length
    ? await supabase.from("workout_sets").select("*").in("session_id", sessionIds)
    : { data: [] as SetRow[] };
  const sets = (setsRes.data ?? []) as SetRow[];

  const todaySchedule = scheduleRows.find((r) => r.weekday === weekday) ?? null;
  const plannedType = todaySchedule?.workout_type ?? "rest";
  const customName = todaySchedule?.custom_name ?? null;
  const scheduleId = todaySchedule?.id ?? null;
  const isRestDay = plannedType === "rest";

  const library = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    muscle: e.muscle_group,
  }));

  const todaySession = sessions.find((s) => s.session_date === today) ?? null;
  const todaySets = todaySession
    ? sets.filter((s) => s.session_id === todaySession.id)
    : [];

  // Consecutive training days (completed or with sets) ending today/yesterday.
  const trainingDates = new Set(
    sessions
      .filter(
        (s) =>
          s.completed ||
          sets.some((x) => x.session_id === s.id && !x.is_warmup),
      )
      .map((s) => s.session_date),
  );
  let consecutive = 0;
  let cursor = trainingDates.has(today) ? today : addDaysISO(today, -1);
  while (trainingDates.has(cursor)) {
    consecutive += 1;
    cursor = addDaysISO(cursor, -1);
  }

  // Per-exercise history (last two training sessions before today).
  const pastTraining = sessions
    .filter((s) => s.session_date < today)
    .sort((a, b) => b.session_date.localeCompare(a.session_date));
  const recentBackPain = pastTraining
    .map((s) => s.back_pain)
    .filter((n): n is number => n != null)
    .slice(0, 2);

  function historyFor(eid: string) {
    const found: { reps: number | null; weight: number | null }[][] = [];
    for (const s of pastTraining) {
      const ws = sets.filter(
        (x) => x.session_id === s.id && x.exercise_id === eid && !x.is_warmup,
      );
      if (ws.length) found.push(ws.map((w) => ({ reps: w.reps, weight: w.weight })));
      if (found.length === 2) break;
    }
    const last = found[0] ?? [];
    const prev = found[1] ?? [];
    const top = last.length
      ? Math.max(...last.map((w) => Number(w.weight ?? 0)))
      : null;
    const lastSummary = last.length
      ? `${top}kg × ${last.map((w) => w.reps ?? "—").join(",")}`
      : null;
    return { last, prev, prefillWeight: top, lastSummary };
  }

  const todaySchedExercises = scheduleId
    ? schedEx.filter((se) => se.schedule_id === scheduleId)
    : [];

  // Resolve a "today" plan row into the shape the logger / start view need.
  function buildPlanned(se: SchedEx) {
    const ex = se.exercises;
    const eid = se.exercise_id ?? "";
    const h = historyFor(eid);
    const partner = todaySchedExercises.find(
      (o) => o.id !== se.id && o.superset_group && o.superset_group === se.superset_group,
    );
    const advice = suggestOverload({
      lastWorkingSets: h.last,
      prevWorkingSets: h.prev,
      repMin: se.target_rep_min,
      repMax: se.target_rep_max,
      weightIncrement: ex?.weight_increment ?? 2.5,
      recentBackPain,
      isBackSensitive: se.is_back_sensitive || (ex?.is_back_sensitive ?? false),
    });
    return { se, ex, eid, h, partner, advice };
  }

  const todayState: "summary" | "logging" | "rest" | "start" =
    todaySession?.completed
      ? "summary"
      : todaySession && (todaySets.length > 0 || !isRestDay)
        ? "logging"
        : isRestDay
          ? "rest"
          : "start";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Workouts</h1>
        <p className="mt-0.5 text-sm text-muted">Train hard, protect the back.</p>
      </div>

      <WorkoutTabs active={tab} />

      {/* ──────────────── TODAY ──────────────── */}
      {tab === "today" ? (
        <div className="space-y-4">
          {todayState === "rest" ? (
            <RestView
              dayName={customName || titleize(plannedType)}
              consecutive={consecutive}
              backToday={todaySession?.back_pain ?? null}
            />
          ) : null}

          {todayState === "start" ? (
            <div className="space-y-4">
              <SessionHeader
                title={customName || titleize(plannedType)}
                subtitle={MUSCLES[plannedType] ?? "Training"}
              />
              {deloadActive ? <DeloadBanner pct={deloadPct} /> : null}

              {todaySchedExercises.length === 0 ? (
                <EmptyState
                  icon={Dumbbell}
                  title="No exercises planned"
                  hint="Add exercises to this day in Settings."
                />
              ) : (
                <div className="space-y-2">
                  {todaySchedExercises.map((se) => {
                    const p = buildPlanned(se);
                    const toneCls =
                      p.advice.tone === "success"
                        ? "text-green-400"
                        : p.advice.tone === "warning"
                          ? "text-red-400"
                          : "text-muted";
                    return (
                      <div
                        key={se.id}
                        className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4 text-[13px]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">
                            {p.ex?.name ?? "Exercise"}
                          </span>
                          {p.se.is_back_sensitive || p.ex?.is_back_sensitive ? (
                            <span className="rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[10px] text-red-400">
                              back-sensitive
                            </span>
                          ) : null}
                          {p.partner ? (
                            <span className="text-[11px] text-amber-500">
                              Superset with {p.partner.exercises?.name}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {p.ex?.muscle_group ? `${p.ex.muscle_group} · ` : ""}
                          {se.target_sets} × {se.target_rep_min}–{se.target_rep_max}
                          {p.h.lastSummary ? ` · last: ${p.h.lastSummary}` : ""}
                        </p>
                        <p className={cn("mt-1 text-xs font-medium", toneCls)}>
                          {p.advice.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <form action={startSession}>
                <input type="hidden" name="workout_type" value={plannedType} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-black hover:bg-amber-400"
                >
                  <Plus className="size-4" /> Start session
                </button>
              </form>
            </div>
          ) : null}

          {todayState === "logging" && todaySession ? (
            <div className="space-y-4">
              <SessionHeader
                title={customName || titleize(plannedType)}
                subtitle={MUSCLES[plannedType] ?? "Training"}
              />
              <SessionLogger
                sessionId={todaySession.id}
                deloadActive={deloadActive}
                deloadPct={deloadPct}
                library={library}
                exercises={todaySchedExercises.map((se): LoggerExercise => {
                  const p = buildPlanned(se);
                  return {
                    scheduleExId: se.id,
                    exerciseId: p.eid,
                    name: p.ex?.name ?? "Exercise",
                    muscle: p.ex?.muscle_group ?? null,
                    targetSets: se.target_sets,
                    repMin: se.target_rep_min,
                    repMax: se.target_rep_max,
                    weightIncrement: p.ex?.weight_increment ?? 2.5,
                    backSensitive:
                      se.is_back_sensitive || (p.ex?.is_back_sensitive ?? false),
                    supersetWith: p.partner?.exercises?.name ?? null,
                    prefillWeight: p.h.prefillWeight,
                    lastSummary: p.h.lastSummary,
                    loggedSets: todaySets
                      .filter((s) => s.exercise_id === p.eid && !s.is_warmup)
                      .sort((a, b) => a.set_number - b.set_number)
                      .map((s) => ({
                        id: s.id,
                        set_number: s.set_number,
                        reps: s.reps,
                        weight: s.weight,
                      })),
                  };
                })}
              />
            </div>
          ) : null}

          {todayState === "summary" && todaySession ? (
            <SessionSummary session={todaySession} sets={todaySets} />
          ) : null}
        </div>
      ) : null}

      {/* ──────────────── HISTORY ──────────────── */}
      {tab === "history" ? (
        <HistoryList
          sessions={sessions
            .filter((s) => s.session_date < today || s.completed)
            .map((s) => ({
              id: s.id,
              session_date: s.session_date,
              workout_type: s.workout_type,
              back_pain: s.back_pain,
              energy: s.energy,
              duration_min: s.duration_min,
            }))}
          sets={sets}
        />
      ) : null}

      {/* ──────────────── SETTINGS ──────────────── */}
      {tab === "settings" ? (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Weekly split
            </h2>
            <SplitBuilder
              days={Array.from({ length: 7 }, (_, wd): SplitDay => {
                const row = scheduleRows.find((r) => r.weekday === wd);
                return {
                  weekday: wd,
                  scheduleId: row?.id ?? null,
                  workoutType: row?.workout_type ?? "rest",
                  customName: row?.custom_name ?? null,
                };
              })}
              exercises={schedEx.map(
                (se): SplitExercise => ({
                  id: se.id,
                  schedule_id: se.schedule_id,
                  exercise_id: se.exercise_id,
                  name: se.exercises?.name ?? "Exercise",
                  muscle: se.exercises?.muscle_group ?? null,
                  target_sets: se.target_sets,
                  target_rep_min: se.target_rep_min,
                  target_rep_max: se.target_rep_max,
                  superset_group: se.superset_group,
                  is_back_sensitive: se.is_back_sensitive,
                }),
              )}
              library={library}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Exercise library
              </h2>
              <FormModal title="New exercise" triggerLabel="Add" action={addExercise}>
                {exerciseFields()}
              </FormModal>
            </div>
            {exercises.length === 0 ? (
              <EmptyState icon={Dumbbell} title="No exercises" hint="Build your catalog." />
            ) : (
              <div className="space-y-1.5">
                {exercises.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg border border-[#1e1e1e] bg-[#141414] p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {e.name}
                        {e.is_back_sensitive ? (
                          <span className="ml-1.5 text-[10px] text-red-400">
                            back-sensitive
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">
                        {e.muscle_group ? `${e.muscle_group} · ` : ""}
                        {e.target_rep_min}–{e.target_rep_max} reps · +{e.weight_increment}kg
                      </p>
                    </div>
                    <FormModal
                      title="Edit exercise"
                      triggerLabel="Edit"
                      action={updateExercise}
                    >
                      <input type="hidden" name="id" value={e.id} />
                      {exerciseFields(e)}
                    </FormModal>
                    <form action={deleteExercise}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="rounded p-1.5 text-muted hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Recovery
            </h2>
            <DeloadControl active={deloadActive} percentage={deloadPct} />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SessionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-500">
        {title}
      </span>
      <span className="text-sm text-muted">{subtitle}</span>
    </div>
  );
}

function DeloadBanner({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
      <TriangleAlert className="size-4" /> Deload active — work at {pct}% of your
      usual weights.
    </div>
  );
}

function RestView({
  dayName,
  consecutive,
  backToday,
}: {
  dayName: string;
  consecutive: number;
  backToday: number | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-[#1e1e1e] bg-[#141414] p-6">
        <BedDouble className="mt-0.5 size-6 text-muted" />
        <div>
          <p className="text-base font-semibold">Rest day{dayName ? ` · ${dayName}` : ""}</p>
          <p className="text-sm text-muted">
            {consecutive > 0
              ? `${consecutive} training day${consecutive === 1 ? "" : "s"} in a row — let the disc recover.`
              : "Recovery is part of the plan."}
          </p>
          <Link
            href="/workouts?tab=history"
            className="mt-2 inline-block text-xs text-amber-500 hover:text-amber-400"
          >
            View history →
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e1e1e] bg-[#141414] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Back check-in
        </p>
        {backToday != null ? (
          <p className="mt-2 text-sm text-muted">
            Logged today:{" "}
            <span className="font-semibold tabular-nums text-text">{backToday}/10</span>
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { v: 2, label: "1–3 Fine", cls: "border-green-400/40 text-green-400" },
              { v: 5, label: "4–6 Moderate", cls: "border-amber-500/40 text-amber-500" },
              { v: 8, label: "7–10 Bad", cls: "border-red-400/40 text-red-400" },
            ].map((b) => (
              <form action={logBackPain} key={b.v}>
                <input type="hidden" name="back_pain" value={b.v} />
                <button
                  type="submit"
                  className={cn(
                    "rounded-lg border bg-[#1a1a1a] px-3 py-1.5 text-xs",
                    b.cls,
                  )}
                >
                  {b.label}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionSummary({
  session,
  sets,
}: {
  session: Session;
  sets: SetRow[];
}) {
  const working = sets.filter((s) => !s.is_warmup);
  const order: string[] = [];
  const groups = new Map<string, SetRow[]>();
  for (const st of working) {
    const key = st.exercise_id ?? st.exercise_name ?? st.id;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(st);
  }
  const painCls =
    session.back_pain == null
      ? "text-muted"
      : session.back_pain >= 7
        ? "text-red-400"
        : session.back_pain >= 4
          ? "text-amber-500"
          : "text-green-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-green-400">
        <Check className="size-5" />
        <span className="text-sm font-semibold">Session complete</span>
        <div className="ml-auto flex items-center gap-1.5">
          <form action={reopenSession}>
            <input type="hidden" name="id" value={session.id} />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-md border border-[#2a2a2a] px-2 py-1 text-xs text-muted hover:text-text"
            >
              <Pencil className="size-3" /> Edit
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#1e1e1e] bg-[#1e1e1e] sm:grid-cols-3">
        <Stat label="Back pain">
          <span className={cn("text-sm font-medium tabular-nums", painCls)}>
            {session.back_pain ?? "—"}/10
          </span>
        </Stat>
        <Stat label="Energy">
          <span className="text-sm font-medium tabular-nums">
            {session.energy ?? "—"}/10
          </span>
        </Stat>
        <Stat label="Duration">
          <span className="text-sm font-medium tabular-nums">
            {session.duration_min ? `${session.duration_min}m` : "—"}
          </span>
        </Stat>
      </div>

      <div className="space-y-2">
        {order.map((key) => {
          const rows = groups.get(key)!;
          return (
            <div
              key={key}
              className="rounded-lg border border-[#1e1e1e] bg-[#141414] p-3"
            >
              <p className="mb-1 text-sm font-medium">
                {rows[0].exercise_name ?? "Exercise"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rows.map((st) => (
                  <span
                    key={st.id}
                    className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-0.5 text-xs tabular-nums text-muted"
                  >
                    {st.weight ?? "—"}×{st.reps ?? "—"}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {session.notes ? (
        <p className="rounded-lg border border-[#1e1e1e] bg-[#141414] p-3 text-xs text-muted">
          {session.notes}
        </p>
      ) : null}

      <form action={deleteSession}>
        <input type="hidden" name="id" value={session.id} />
        <button type="submit" className="text-xs text-muted hover:text-red-400">
          Delete session
        </button>
      </form>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function exerciseFields(e?: {
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  target_rep_min: number;
  target_rep_max: number;
  weight_increment: number;
  is_back_sensitive: boolean;
}) {
  return (
    <>
      <Field label="Name">
        <Input name="name" required defaultValue={e?.name} placeholder="Romanian Deadlift" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Muscle group">
          <Input name="muscle_group" defaultValue={e?.muscle_group ?? ""} placeholder="Hamstrings" />
        </Field>
        <Field label="Equipment">
          <Input name="equipment" defaultValue={e?.equipment ?? ""} placeholder="Barbell" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Rep min">
          <Input name="target_rep_min" type="number" defaultValue={e?.target_rep_min ?? 8} />
        </Field>
        <Field label="Rep max">
          <Input name="target_rep_max" type="number" defaultValue={e?.target_rep_max ?? 12} />
        </Field>
        <Field label="Increment kg">
          <Input name="weight_increment" type="number" step="0.5" defaultValue={e?.weight_increment ?? 2.5} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="is_back_sensitive"
          defaultChecked={e?.is_back_sensitive}
          className="size-4"
        />
        Back-sensitive (cautious overload)
      </label>
    </>
  );
}
