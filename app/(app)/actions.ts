"use server";

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
