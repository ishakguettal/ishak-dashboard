"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WORKOUT_TYPES } from "@/lib/constants";
import { titleize } from "@/lib/utils/format";
import {
  setScheduleDay,
  addScheduleExercise,
  updateScheduleExercise,
  removeScheduleExercise,
  moveScheduleExercise,
  toggleScheduleExerciseBack,
  setSuperset,
} from "@/app/(app)/workouts/actions";

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export type SplitDay = {
  weekday: number;
  scheduleId: string | null;
  workoutType: string;
  customName: string | null;
};

export type SplitExercise = {
  id: string;
  schedule_id: string;
  exercise_id: string | null;
  name: string;
  muscle: string | null;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  superset_group: string | null;
  is_back_sensitive: boolean;
};

const inputCls =
  "h-8 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 text-xs tabular-nums focus:border-amber-500 focus:outline-none";

export function SplitBuilder({
  days,
  exercises,
  library,
}: {
  days: SplitDay[];
  exercises: SplitExercise[];
  library: { id: string; name: string; muscle: string | null }[];
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const isRest = day.workoutType === "rest";
        const isOpen = open === day.weekday;
        const dayExercises = exercises.filter(
          (e) => e.schedule_id === day.scheduleId,
        ); // pre-sorted by sort_order upstream
        return (
          <div
            key={day.weekday}
            className="overflow-hidden rounded-xl border border-[#1e1e1e] bg-[#141414]"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : day.weekday)}
              className="flex w-full items-center gap-3 p-3.5 text-left"
            >
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted transition-transform",
                  isOpen && "rotate-180",
                )}
              />
              <span className="w-24 text-sm font-semibold">
                {DAY_NAMES[day.weekday]}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  isRest
                    ? "border-[#2a2a2a] bg-[#1a1a1a] text-muted"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-500",
                )}
              >
                {day.customName || titleize(day.workoutType)}
              </span>
              {!isRest ? (
                <span className="ml-auto text-xs text-muted">
                  {dayExercises.length} exercise
                  {dayExercises.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </button>

            {isOpen ? (
              <div className="space-y-3 border-t border-[#1e1e1e] p-3.5">
                {/* Day type editor */}
                <form action={setScheduleDay} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="weekday" value={day.weekday} />
                  <label className="text-[10px] uppercase tracking-wide text-muted">
                    Type
                    <select
                      name="workout_type"
                      defaultValue={day.workoutType}
                      className="mt-0.5 block h-8 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 text-xs"
                    >
                      {WORKOUT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {titleize(t)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 text-[10px] uppercase tracking-wide text-muted">
                    Custom name
                    <input
                      name="custom_name"
                      defaultValue={day.customName ?? ""}
                      placeholder="e.g. Push A"
                      className="mt-0.5 block h-8 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 text-xs"
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-8 rounded-md bg-amber-500 px-3 text-xs font-semibold text-black hover:bg-amber-400"
                  >
                    Save
                  </button>
                </form>

                {!isRest && day.scheduleId ? (
                  <>
                    {/* Exercise list */}
                    {dayExercises.map((ex, i) => (
                      <div
                        key={ex.id}
                        className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <form action={moveScheduleExercise}>
                              <input type="hidden" name="id" value={ex.id} />
                              <input type="hidden" name="dir" value="up" />
                              <input
                                type="hidden"
                                name="schedule_id"
                                value={ex.schedule_id}
                              />
                              <button
                                type="submit"
                                disabled={i === 0}
                                className="text-muted hover:text-text disabled:opacity-30"
                              >
                                <ChevronUp className="size-3.5" />
                              </button>
                            </form>
                            <form action={moveScheduleExercise}>
                              <input type="hidden" name="id" value={ex.id} />
                              <input type="hidden" name="dir" value="down" />
                              <input
                                type="hidden"
                                name="schedule_id"
                                value={ex.schedule_id}
                              />
                              <button
                                type="submit"
                                disabled={i === dayExercises.length - 1}
                                className="text-muted hover:text-text disabled:opacity-30"
                              >
                                <ChevronDown className="size-3.5" />
                              </button>
                            </form>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {ex.name}
                              {ex.is_back_sensitive ? (
                                <span className="ml-1.5 text-[10px] text-red-400">
                                  back-sensitive
                                </span>
                              ) : null}
                              {ex.superset_group ? (
                                <span className="ml-1.5 text-[10px] text-amber-500">
                                  SS:{ex.superset_group}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted">{ex.muscle ?? "—"}</p>
                          </div>
                          <form action={removeScheduleExercise}>
                            <input type="hidden" name="id" value={ex.id} />
                            <button
                              type="submit"
                              className="rounded p-1 text-muted hover:text-red-400"
                              title="Remove"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </form>
                        </div>

                        {/* Targets + flags */}
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <form
                            action={updateScheduleExercise}
                            className="flex items-end gap-1.5"
                          >
                            <input type="hidden" name="id" value={ex.id} />
                            <label className="text-[9px] uppercase text-muted">
                              Sets
                              <input
                                name="target_sets"
                                type="number"
                                defaultValue={ex.target_sets}
                                className={cn(inputCls, "mt-0.5 block w-12")}
                              />
                            </label>
                            <label className="text-[9px] uppercase text-muted">
                              Min
                              <input
                                name="target_rep_min"
                                type="number"
                                defaultValue={ex.target_rep_min}
                                className={cn(inputCls, "mt-0.5 block w-12")}
                              />
                            </label>
                            <label className="text-[9px] uppercase text-muted">
                              Max
                              <input
                                name="target_rep_max"
                                type="number"
                                defaultValue={ex.target_rep_max}
                                className={cn(inputCls, "mt-0.5 block w-12")}
                              />
                            </label>
                            <button
                              type="submit"
                              className="h-8 rounded-md border border-[#2a2a2a] px-2 text-xs hover:border-amber-500"
                            >
                              Save
                            </button>
                          </form>

                          <form action={toggleScheduleExerciseBack}>
                            <input type="hidden" name="id" value={ex.id} />
                            <input
                              type="hidden"
                              name="current"
                              value={String(ex.is_back_sensitive)}
                            />
                            <button
                              type="submit"
                              className={cn(
                                "flex h-8 items-center gap-1 rounded-md border px-2 text-xs",
                                ex.is_back_sensitive
                                  ? "border-red-400/40 bg-red-400/10 text-red-400"
                                  : "border-[#2a2a2a] text-muted hover:text-text",
                              )}
                            >
                              <ShieldAlert className="size-3.5" /> Back
                            </button>
                          </form>

                          <form
                            action={setSuperset}
                            className="flex items-end gap-1"
                          >
                            <input type="hidden" name="id" value={ex.id} />
                            <input
                              name="superset_group"
                              defaultValue={ex.superset_group ?? ""}
                              placeholder="SS"
                              className={cn(inputCls, "w-12")}
                            />
                            <button
                              type="submit"
                              className="h-8 rounded-md border border-[#2a2a2a] px-2 text-xs hover:border-amber-500"
                            >
                              Set
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}

                    {/* Add exercise */}
                    {library.length > 0 ? (
                      <form
                        action={addScheduleExercise}
                        className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-[#2a2a2a] p-2.5"
                      >
                        <input
                          type="hidden"
                          name="schedule_id"
                          value={day.scheduleId}
                        />
                        <label className="min-w-32 flex-1 text-[9px] uppercase text-muted">
                          Exercise
                          <select
                            name="exercise_id"
                            required
                            className="mt-0.5 block h-8 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 text-xs"
                          >
                            {library.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-[9px] uppercase text-muted">
                          Sets
                          <input
                            name="target_sets"
                            type="number"
                            defaultValue={3}
                            className={cn(inputCls, "mt-0.5 block w-12")}
                          />
                        </label>
                        <label className="text-[9px] uppercase text-muted">
                          Min
                          <input
                            name="target_rep_min"
                            type="number"
                            defaultValue={8}
                            className={cn(inputCls, "mt-0.5 block w-12")}
                          />
                        </label>
                        <label className="text-[9px] uppercase text-muted">
                          Max
                          <input
                            name="target_rep_max"
                            type="number"
                            defaultValue={12}
                            className={cn(inputCls, "mt-0.5 block w-12")}
                          />
                        </label>
                        <button
                          type="submit"
                          className="flex h-8 items-center gap-1 rounded-md bg-amber-500 px-2.5 text-xs font-semibold text-black hover:bg-amber-400"
                        >
                          <Plus className="size-3.5" /> Add
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-muted">
                        Add exercises to your library first.
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
