"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO, weekStartISO } from "@/lib/utils/date";

function refresh() {
  revalidatePath("/reflection");
  revalidatePath("/");
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

export async function saveMoodEnergy(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("daily_logs").upsert(
    {
      user_id: user.id,
      log_date: todayISO(),
      mood: numberOrNull(formData.get("mood")),
      energy: numberOrNull(formData.get("energy")),
      notes: String(formData.get("notes") ?? "") || null,
    },
    { onConflict: "user_id,log_date" },
  );
  refresh();
}

export async function saveWeeklyReflection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("weekly_reflections").upsert(
    {
      user_id: user.id,
      week_start: String(formData.get("week_start") || weekStartISO()),
      wins: String(formData.get("wins") ?? "") || null,
      challenges: String(formData.get("challenges") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
      rating: numberOrNull(formData.get("rating")),
    },
    { onConflict: "user_id,week_start" },
  );
  refresh();
}

export async function deleteWeeklyReflection(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("weekly_reflections").delete().eq("id", id);
  refresh();
}
