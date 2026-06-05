import {
  Dumbbell,
  Trash2,
  Plus,
  CalendarClock,
  History,
  BedDouble,
  TriangleAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormModal } from "@/components/ui/FormModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScheduleStrip } from "@/components/workouts/ScheduleStrip";
import { SessionForm } from "@/components/workouts/SessionForm";
import { OverloadHint } from "@/components/workouts/OverloadHint";
import {
  WORKOUT_TYPES,
  WORKOUT_TYPE_STYLES,
} from "@/lib/constants";
import { todayISO, weekdayOf, addDaysISO, formatDateShort } from "@/lib/utils/date";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { suggestOverload, type OverloadAdvice } from "@/lib/utils/overload";
import type {
  Exercise,
  WorkoutSession,
  WorkoutSet,
  WorkoutScheduleRow,
} from "@/lib/types/db";
import {
  startSession,
  addSet,
  deleteSet,
  deleteSession,
  addExercise,
  deleteExercise,
} from "./actions";

export const dynamic = "force-dynamic";

function painBadge(pain: number | null) {
  if (pain == null) return "bg-surface-2 text-muted border-border";
  if (pain >= 7) return "bg-danger/15 text-danger border-danger/30";
  if (pain >= 4) return "bg-warning/15 text-warning border-warning/30";
  return "bg-success/15 text-success border-success/30";
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const today = todayISO();
  const weekday = weekdayOf(today);

  const [scheduleRes, exercisesRes, sessionsRes] = await Promise.all([
    supabase.from("workout_schedule").select("weekday,workout_type,label"),
    supabase.from("exercises").select("*").order("name"),
    supabase
      .from("workout_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .limit(20),
  ]);

  const scheduleRows = (scheduleRes.data ?? []) as Pick<
    WorkoutScheduleRow,
    "weekday" | "workout_type" | "label"
  >[];
  const types: string[] = Array.from({ length: 7 }, (_, i) => {
    const row = scheduleRows.find((r) => r.weekday === i);
    return row?.workout_type ?? "rest";
  });
  const plannedType = types[weekday];
  const isRestDay = plannedType === "rest";

  const exercises = (exercisesRes.data ?? []) as Exercise[];
  const sessions = (sessionsRes.data ?? []) as WorkoutSession[];
  const sessionIds = sessions.map((s) => s.id);
  const setsRes = sessionIds.length
    ? await supabase.from("workout_sets").select("*").in("session_id", sessionIds)
    : { data: [] as WorkoutSet[] };
  const sets = (setsRes.data ?? []) as WorkoutSet[];

  const todaySession = sessions.find((s) => s.session_date === today) ?? null;
  const pastSessions = sessions.filter((s) => s.session_date < today);

  // Consecutive training days ending today/yesterday.
  const sessionDates = new Set(sessions.map((s) => s.session_date));
  let consecutive = 0;
  let cursor = sessionDates.has(today) ? today : addDaysISO(today, -1);
  while (sessionDates.has(cursor)) {
    consecutive += 1;
    cursor = addDaysISO(cursor, -1);
  }

  const recentBackPain = pastSessions
    .slice(0, 2)
    .map((s) => s.back_pain)
    .filter((n): n is number => n != null);

  function adviceFor(exerciseId: string): OverloadAdvice {
    const ex = exercises.find((e) => e.id === exerciseId);
    let lastWorkingSets: { reps: number | null; weight: number | null }[] = [];
    for (const s of pastSessions) {
      const ws = sets.filter(
        (st) =>
          st.session_id === s.id &&
          st.exercise_id === exerciseId &&
          !st.is_warmup,
      );
      if (ws.length) {
        lastWorkingSets = ws.map((w) => ({ reps: w.reps, weight: w.weight }));
        break;
      }
    }
    return suggestOverload({
      lastWorkingSets,
      repMin: ex?.target_rep_min ?? 8,
      repMax: ex?.target_rep_max ?? 12,
      weightIncrement: ex?.weight_increment ?? 2.5,
      recentBackPain,
      isBackSensitive: ex?.is_back_sensitive ?? false,
    });
  }

  // Today's sets grouped by exercise (preserving first-seen order).
  const todaySets = todaySession
    ? sets.filter((s) => s.session_id === todaySession.id)
    : [];
  const groupOrder: string[] = [];
  const groups = new Map<string, WorkoutSet[]>();
  for (const st of todaySets) {
    const key = st.exercise_id ?? st.exercise_name ?? st.id;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(st);
  }

  const exerciseModal = (
    <FormModal title="New exercise" triggerLabel="Exercise" action={addExercise}>
      <Field label="Name">
        <Input name="name" required placeholder="e.g. Romanian Deadlift" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Muscle group">
          <Input name="muscle_group" placeholder="Hamstrings" />
        </Field>
        <Field label="Equipment">
          <Input name="equipment" placeholder="Barbell" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Rep min">
          <Input name="target_rep_min" type="number" defaultValue={8} />
        </Field>
        <Field label="Rep max">
          <Input name="target_rep_max" type="number" defaultValue={12} />
        </Field>
        <Field label="Increment kg">
          <Input name="weight_increment" type="number" step="0.5" defaultValue={2.5} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="is_back_sensitive" className="size-4" />
        Back-sensitive (cautious overload)
      </label>
    </FormModal>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Workouts</h1>
        <p className="mt-0.5 text-sm text-muted">
          Train hard, protect the back.
        </p>
      </div>

      <ScheduleStrip types={types} todayWeekday={weekday} />

      {consecutive >= 6 ? (
        <Card className="flex items-start gap-3 border-warning/40 bg-warning/10">
          <TriangleAlert className="mt-0.5 size-5 text-warning" />
          <div>
            <p className="text-sm font-medium text-warning">
              {consecutive} training days in a row
            </p>
            <p className="text-xs text-muted">
              Schedule a rest day — recovery protects your L5-S1 disc and drives
              progress.
            </p>
          </div>
        </Card>
      ) : null}

      {/* Today */}
      <Card>
        <CardHeader
          title={`Today · ${titleize(plannedType)}`}
          icon={CalendarClock}
          action={exerciseModal}
        />

        {isRestDay && !todaySession ? (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/40 p-4">
            <BedDouble className="mt-0.5 size-5 text-muted" />
            <div>
              <p className="text-sm font-medium">Scheduled rest day</p>
              <p className="text-xs text-muted">
                Recovery matters as much as training. Log a light session only if
                you really did one.
              </p>
            </div>
          </div>
        ) : null}

        {!todaySession ? (
          <form action={startSession} className="mt-3 flex items-end gap-2">
            <Field label="Session type" className="w-40">
              <Select
                name="workout_type"
                defaultValue={isRestDay ? "full_body" : plannedType}
              >
                {WORKOUT_TYPES.filter((t) => t !== "rest").map((t) => (
                  <option key={t} value={t}>
                    {titleize(t)}
                  </option>
                ))}
              </Select>
            </Field>
            <SubmitButton>
              <Plus className="size-4" /> Start session
            </SubmitButton>
          </form>
        ) : (
          <div className="space-y-5">
            <SessionForm session={todaySession} />

            {/* Logged exercises */}
            {groupOrder.length > 0 ? (
              <div className="space-y-4">
                {groupOrder.map((key) => {
                  const rows = groups.get(key)!;
                  const name = rows[0].exercise_name ?? "Exercise";
                  const exId = rows[0].exercise_id;
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-border bg-surface-2/40 p-3"
                    >
                      <p className="mb-2 text-sm font-semibold">{name}</p>
                      <ul className="mb-2 space-y-1">
                        {rows.map((st) => (
                          <li
                            key={st.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="w-10 text-xs text-muted">
                              {st.is_warmup ? "W" : `#${st.set_number}`}
                            </span>
                            <span className="tabular-nums">
                              {st.reps ?? "—"} reps × {st.weight ?? "—"} kg
                            </span>
                            <form action={deleteSet} className="ml-auto">
                              <input type="hidden" name="id" value={st.id} />
                              <button
                                type="submit"
                                className="rounded p-1 text-muted hover:text-danger"
                                title="Delete set"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                      {exId ? <OverloadHint advice={adviceFor(exId)} /> : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Add set */}
            {exercises.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="No exercises yet"
                hint="Add an exercise (top right) to start logging sets."
              />
            ) : (
              <form
                action={addSet}
                className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
              >
                <input type="hidden" name="session_id" value={todaySession.id} />
                <Field label="Exercise" className="min-w-40 flex-1">
                  <Select name="exercise_id" required>
                    {exercises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Reps" className="w-20">
                  <Input name="reps" type="number" min={0} />
                </Field>
                <Field label="Weight" className="w-24">
                  <Input name="weight" type="number" step="any" min={0} />
                </Field>
                <label className="flex h-10 items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" name="is_warmup" className="size-4" />
                  Warm-up
                </label>
                <SubmitButton size="sm">
                  <Plus className="size-4" /> Add set
                </SubmitButton>
              </form>
            )}

            <form action={deleteSession}>
              <input type="hidden" name="id" value={todaySession.id} />
              <button
                type="submit"
                className="text-xs text-muted hover:text-danger"
              >
                Delete today&apos;s session
              </button>
            </form>
          </div>
        )}
      </Card>

      {/* Exercise library */}
      <Card>
        <CardHeader title="Exercise library" icon={Dumbbell} action={exerciseModal} />
        {exercises.length === 0 ? (
          <EmptyState icon={Dumbbell} title="No exercises" hint="Build your catalog." />
        ) : (
          <ul className="divide-y divide-border">
            {exercises.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {e.name}
                    {e.is_back_sensitive ? (
                      <Badge className="ml-2 border-warning/30 bg-warning/10 text-warning">
                        back-safe
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    {e.muscle_group ? `${e.muscle_group} · ` : ""}
                    {e.target_rep_min}-{e.target_rep_max} reps · +{e.weight_increment}kg
                  </p>
                </div>
                <form action={deleteExercise}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    className="rounded p-1.5 text-muted hover:text-danger"
                    title="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* History */}
      <Card>
        <CardHeader title="History" icon={History} />
        {pastSessions.length === 0 ? (
          <EmptyState icon={History} title="No past sessions" hint="Logged workouts appear here." />
        ) : (
          <div className="space-y-3">
            {pastSessions.map((s) => {
              const sSets = sets.filter(
                (x) => x.session_id === s.id && !x.is_warmup,
              );
              const exNames = Array.from(
                new Set(sSets.map((x) => x.exercise_name).filter(Boolean)),
              );
              return (
                <div
                  key={s.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2/40 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatDateShort(s.session_date)}
                      </span>
                      <Badge
                        className={cn(
                          WORKOUT_TYPE_STYLES[s.workout_type ?? "rest"],
                        )}
                      >
                        {titleize(s.workout_type ?? "—")}
                      </Badge>
                      <Badge className={painBadge(s.back_pain)}>
                        back {s.back_pain ?? "—"}/10
                      </Badge>
                      {s.duration_min ? (
                        <span className="text-xs text-muted">
                          {s.duration_min}m
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      {sSets.length} sets
                      {exNames.length ? ` · ${exNames.join(", ")}` : ""}
                    </p>
                  </div>
                  <form action={deleteSession}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded p-1.5 text-muted hover:text-danger"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
