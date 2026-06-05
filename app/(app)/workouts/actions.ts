"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/date";
import { WORKOUT_TYPES } from "@/lib/constants";

function refresh() {
  revalidatePath("/workouts");
  revalidatePath("/");
}

// ---------- Schedule ----------
export async function setSchedule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const type = String(formData.get(`type_${weekday}`) ?? "rest");
    if (!WORKOUT_TYPES.includes(type as never)) continue;
    rows.push({ user_id: user.id, weekday, workout_type: type, label: null });
  }
  await supabase
    .from("workout_schedule")
    .upsert(rows, { onConflict: "user_id,weekday" });
  refresh();
}

// ---------- Exercises ----------
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

export async function deleteExercise(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("exercises").delete().eq("id", id);
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
      .insert({ session_date: today, workout_type });
  }
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

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}
