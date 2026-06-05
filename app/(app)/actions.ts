"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
