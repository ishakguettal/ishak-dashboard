"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/date";
import { WORKOUT_TYPES } from "@/lib/constants";

function refresh() {
  revalidatePath("/workouts");
  revalidatePath("/");
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

async function uid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---------- Schedule (split builder) ----------
export async function setScheduleDay(formData: FormData) {
  const { supabase, user } = await uid();
  if (!user) return;
  const weekday = Number(formData.get("weekday"));
  const type = String(formData.get("workout_type") ?? "rest");
  const custom = String(formData.get("custom_name") ?? "").trim() || null;
  if (!WORKOUT_TYPES.includes(type as never)) return;
  await supabase.from("workout_schedule").upsert(
    {
      user_id: user.id,
      weekday,
      workout_type: type,
      custom_name: custom,
    },
    { onConflict: "user_id,weekday" },
  );
  refresh();
}

// ---------- Exercises (library) ----------
export async function addExercise(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("exercises").insert({
    name,
    muscle_group: String(formData.get("muscle_group") ?? "") || null,
    equipment: String(formData.get("equipment") ?? "") || null,
    target_rep_min: Number(formData.get("target_rep_min") ?? 8) || 8,
    target_rep_max: Number(formData.get("target_rep_max") ?? 12) || 12,
    weight_increment: Number(formData.get("weight_increment") ?? 2.5) || 2.5,
    is_back_sensitive: formData.get("is_back_sensitive") === "on",
  });
  refresh();
}

export async function updateExercise(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("exercises")
    .update({
      name: String(formData.get("name") ?? "").trim() || undefined,
      muscle_group: String(formData.get("muscle_group") ?? "") || null,
      equipment: String(formData.get("equipment") ?? "") || null,
      target_rep_min: Number(formData.get("target_rep_min") ?? 8) || 8,
      target_rep_max: Number(formData.get("target_rep_max") ?? 12) || 12,
      weight_increment: Number(formData.get("weight_increment") ?? 2.5) || 2.5,
      is_back_sensitive: formData.get("is_back_sensitive") === "on",
    })
    .eq("id", id);
  refresh();
}

export async function deleteExercise(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("exercises").delete().eq("id", id);
  refresh();
}

// ---------- Schedule exercises (per-day plan) ----------
export async function addScheduleExercise(formData: FormData) {
  const { supabase, user } = await uid();
  if (!user) return;
  const schedule_id = String(formData.get("schedule_id"));
  const exercise_id = String(formData.get("exercise_id"));
  if (!schedule_id || !exercise_id) return;

  const { count } = await supabase
    .from("schedule_exercises")
    .select("*", { count: "exact", head: true })
    .eq("schedule_id", schedule_id);

  await supabase.from("schedule_exercises").insert({
    user_id: user.id,
    schedule_id,
    exercise_id,
    target_sets: Number(formData.get("target_sets") ?? 3) || 3,
    target_rep_min: Number(formData.get("target_rep_min") ?? 8) || 8,
    target_rep_max: Number(formData.get("target_rep_max") ?? 12) || 12,
    sort_order: count ?? 0,
  });
  refresh();
}

export async function updateScheduleExercise(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("schedule_exercises")
    .update({
      target_sets: Number(formData.get("target_sets") ?? 3) || 3,
      target_rep_min: Number(formData.get("target_rep_min") ?? 8) || 8,
      target_rep_max: Number(formData.get("target_rep_max") ?? 12) || 12,
    })
    .eq("id", id);
  refresh();
}

export async function removeScheduleExercise(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("schedule_exercises").delete().eq("id", id);
  refresh();
}

export async function toggleScheduleExerciseBack(formData: FormData) {
  const id = String(formData.get("id"));
  const current = String(formData.get("current")) === "true";
  const supabase = await createClient();
  await supabase
    .from("schedule_exercises")
    .update({ is_back_sensitive: !current })
    .eq("id", id);
  refresh();
}

export async function setSuperset(formData: FormData) {
  const id = String(formData.get("id"));
  const group = String(formData.get("superset_group") ?? "").trim() || null;
  const supabase = await createClient();
  await supabase
    .from("schedule_exercises")
    .update({ superset_group: group })
    .eq("id", id);
  refresh();
}

export async function swapScheduleExercise(formData: FormData) {
  const id = String(formData.get("id"));
  const exercise_id = String(formData.get("exercise_id"));
  if (!id || !exercise_id) return;
  const supabase = await createClient();
  await supabase
    .from("schedule_exercises")
    .update({ exercise_id })
    .eq("id", id);
  refresh();
}

export async function moveScheduleExercise(formData: FormData) {
  const id = String(formData.get("id"));
  const dir = String(formData.get("dir")); // "up" | "down"
  const schedule_id = String(formData.get("schedule_id"));
  if (!id || !schedule_id) return;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("schedule_exercises")
    .select("id,sort_order")
    .eq("schedule_id", schedule_id)
    .order("sort_order");
  const list = (rows ?? []) as { id: string; sort_order: number }[];
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return;

  const a = list[idx];
  const b = list[swapWith];
  await Promise.all([
    supabase
      .from("schedule_exercises")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id),
    supabase
      .from("schedule_exercises")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id),
  ]);
  refresh();
}

// ---------- Deload ----------
export async function setDeload(formData: FormData) {
  const { supabase, user } = await uid();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({
      deload_active: formData.get("deload_active") === "on",
      deload_percentage: Number(formData.get("deload_percentage") ?? 60) || 60,
    })
    .eq("id", user.id);
  refresh();
}

// ---------- Sessions ----------
export async function startSession(formData: FormData) {
  const supabase = await createClient();
  const today = todayISO();
  const workout_type = String(formData.get("workout_type") || "") || null;

  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("session_date", today)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from("workout_sessions")
      .insert({ session_date: today, workout_type, completed: false });
  } else {
    // Adopt an existing (e.g. back check-in) row as the live session.
    await supabase
      .from("workout_sessions")
      .update({ workout_type, completed: false })
      .eq("id", existing.id);
  }
  refresh();
}

export async function finishSession(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("workout_sessions")
    .select("created_at")
    .eq("id", id)
    .maybeSingle();
  let duration: number | null = numberOrNull(formData.get("duration_min"));
  if (duration == null && row?.created_at) {
    const mins = Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000);
    duration = mins > 0 && mins < 600 ? mins : null;
  }

  await supabase
    .from("workout_sessions")
    .update({
      completed: true,
      back_pain: numberOrNull(formData.get("back_pain")),
      energy: numberOrNull(formData.get("energy")),
      notes: String(formData.get("notes") ?? "") || null,
      duration_min: duration,
    })
    .eq("id", id);
  refresh();
}

export async function updateSession(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("workout_sessions")
    .update({
      back_pain: numberOrNull(formData.get("back_pain")),
      duration_min: numberOrNull(formData.get("duration_min")),
      energy: numberOrNull(formData.get("energy")),
      notes: String(formData.get("notes") ?? "") || null,
    })
    .eq("id", id);
  refresh();
}

export async function reopenSession(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("workout_sessions")
    .update({ completed: false })
    .eq("id", id);
  refresh();
}

export async function deleteSession(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("workout_sessions").delete().eq("id", id);
  refresh();
}

// ---------- Sets ----------
export async function addSet(formData: FormData) {
  const session_id = String(formData.get("session_id"));
  const exercise_id = String(formData.get("exercise_id"));
  if (!session_id || !exercise_id) return;

  const supabase = await createClient();
  const [{ data: ex }, { count }] = await Promise.all([
    supabase.from("exercises").select("name").eq("id", exercise_id).maybeSingle(),
    supabase
      .from("workout_sets")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session_id)
      .eq("exercise_id", exercise_id),
  ]);

  await supabase.from("workout_sets").insert({
    session_id,
    exercise_id,
    exercise_name: ex?.name ?? null,
    set_number: (count ?? 0) + 1,
    reps: numberOrNull(formData.get("reps")),
    weight: numberOrNull(formData.get("weight")),
    is_warmup: formData.get("is_warmup") === "on",
  });
  refresh();
}

export async function deleteSet(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("workout_sets").delete().eq("id", id);
  refresh();
}
