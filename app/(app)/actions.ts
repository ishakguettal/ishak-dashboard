"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/date";

/**
 * Persists today's overall completion into daily_logs so the streak has
 * history. Upsert only touches completion_pct, preserving mood/energy.
 */
export async function syncDailyCompletion(logDate: string, pct: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("daily_logs").upsert(
    { user_id: user.id, log_date: logDate, completion_pct: pct },
    { onConflict: "user_id,log_date" },
  );
}

/**
 * Updates the user's day window (used by the Pulse ring's time calculation).
 * Stored on the profiles row.
 */
export async function updateDayWindow(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const start = String(formData.get("day_start_time") || "08:00");
  const end = String(formData.get("day_end_time") || "23:30");

  await supabase
    .from("profiles")
    .update({ day_start_time: start, day_end_time: end })
    .eq("id", user.id);
  revalidatePath("/");
}

/**
 * Quick back-pain check-in from the Daily HQ. Records the L5-S1 rating on
 * today's workout session, creating a lightweight (uncompleted) session row if
 * none exists yet — so the disc can be tracked even on rest days without that
 * row counting as a finished workout.
 */
export async function logBackPain(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const value = Number(formData.get("back_pain"));
  if (!value || value < 1 || value > 10) return;

  const today = todayISO();
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("session_date", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("workout_sessions")
      .update({ back_pain: value })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("workout_sessions")
      .insert({ session_date: today, back_pain: value, completed: false });
  }
  revalidatePath("/");
  revalidatePath("/workouts");
}
