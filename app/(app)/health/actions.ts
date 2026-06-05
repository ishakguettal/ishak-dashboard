"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/date";

function refresh() {
  revalidatePath("/health");
  revalidatePath("/");
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

// ---------- Health profile (water target inputs) ----------
export async function updateHealthProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("health_profile").upsert(
    {
      user_id: user.id,
      weight_kg: numberOrNull(formData.get("weight_kg")),
      workout_hours_per_week: numberOrNull(formData.get("workout_hours_per_week")) ?? 0,
      caffeine_mg: numberOrNull(formData.get("caffeine_mg")) ?? 0,
      water_target_override_ml: numberOrNull(formData.get("water_target_override_ml")),
    },
    { onConflict: "user_id" },
  );
  refresh();
}

// ---------- Water ----------
export async function addWater(formData: FormData) {
  const amount = Number(formData.get("amount_ml") ?? 0);
  if (!amount || amount <= 0) return;
  const supabase = await createClient();
  await supabase.from("water_logs").insert({ amount_ml: amount });
  refresh();
}

export async function deleteWater(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("water_logs").delete().eq("id", id);
  refresh();
}

// ---------- Supplements ----------
export async function addSupplement(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("supplements").insert({
    name,
    dosage: String(formData.get("dosage") ?? "") || null,
    timing: String(formData.get("timing") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
  refresh();
}

export async function deleteSupplement(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("supplements").delete().eq("id", id);
  refresh();
}

export async function toggleSupplement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const supplement_id = String(formData.get("supplement_id"));
  const taken = String(formData.get("taken")) === "true";
  await supabase.from("supplement_logs").upsert(
    {
      user_id: user.id,
      supplement_id,
      log_date: todayISO(),
      taken: !taken,
      taken_at: !taken ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,supplement_id,log_date" },
  );
  refresh();
}

// ---------- Sleep ----------
export async function addSleep(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("sleep_logs").upsert(
    {
      user_id: user.id,
      log_date: String(formData.get("log_date") || todayISO()),
      hours: numberOrNull(formData.get("hours")),
      quality: numberOrNull(formData.get("quality")),
      bedtime: String(formData.get("bedtime") || "") || null,
      wake_time: String(formData.get("wake_time") || "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
    { onConflict: "user_id,log_date" },
  );
  refresh();
}

export async function deleteSleep(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("sleep_logs").delete().eq("id", id);
  refresh();
}

// ---------- Body weight ----------
export async function addBodyWeight(formData: FormData) {
  const weight = numberOrNull(formData.get("weight_kg"));
  if (weight == null) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const recorded_on = String(formData.get("recorded_on") || todayISO());
  await supabase.from("body_weights").upsert(
    {
      user_id: user.id,
      recorded_on,
      weight_kg: weight,
      body_fat_pct: numberOrNull(formData.get("body_fat_pct")),
    },
    { onConflict: "user_id,recorded_on" },
  );
  // Keep the water-target weight in sync with the latest entry.
  if (recorded_on >= todayISO()) {
    await supabase
      .from("health_profile")
      .upsert({ user_id: user.id, weight_kg: weight }, { onConflict: "user_id" });
  }
  refresh();
}

export async function deleteBodyWeight(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("body_weights").delete().eq("id", id);
  refresh();
}
