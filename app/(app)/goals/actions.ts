"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO, addDaysISO, weekStartISO } from "@/lib/utils/date";

function refresh() {
  revalidatePath("/goals");
  revalidatePath("/");
}

// ---------- Tasks ----------
export async function addTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await createClient();
  await supabase.from("tasks").insert({
    title,
    priority: String(formData.get("priority") ?? "medium"),
    due_date: String(formData.get("due_date") || todayISO()),
    notes: String(formData.get("notes") ?? "") || null,
  });
  refresh();
}

export async function toggleTask(formData: FormData) {
  const id = String(formData.get("id"));
  const done = String(formData.get("status")) === "done";
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({
      status: done ? "todo" : "done",
      completed_at: done ? null : new Date().toISOString(),
    })
    .eq("id", id);
  refresh();
}

export async function pushToTomorrow(formData: FormData) {
  const id = String(formData.get("id"));
  const due = String(formData.get("due_date"));
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ due_date: addDaysISO(due, 1) })
    .eq("id", id);
  refresh();
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  refresh();
}

// ---------- Summer goals ----------
export async function addSummerGoal(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await createClient();
  await supabase.from("summer_goals").insert({
    title,
    description: String(formData.get("description") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    target_date: String(formData.get("target_date") || "") || null,
  });
  refresh();
}

export async function updateGoalProgress(formData: FormData) {
  const id = String(formData.get("id"));
  const progress = Math.max(
    0,
    Math.min(100, Number(formData.get("progress") ?? 0)),
  );
  const supabase = await createClient();
  await supabase
    .from("summer_goals")
    .update({ progress, status: progress >= 100 ? "done" : "active" })
    .eq("id", id);
  refresh();
}

export async function deleteSummerGoal(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("summer_goals").delete().eq("id", id);
  refresh();
}

// ---------- Weekly targets ----------
export async function addWeeklyTarget(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await createClient();
  await supabase.from("weekly_targets").insert({
    title,
    unit: String(formData.get("unit") ?? "") || null,
    target_value: Number(formData.get("target_value") ?? 0) || null,
    week_start: weekStartISO(),
  });
  refresh();
}

export async function updateWeeklyTarget(formData: FormData) {
  const id = String(formData.get("id"));
  const current = Number(formData.get("current_value") ?? 0);
  const supabase = await createClient();
  await supabase
    .from("weekly_targets")
    .update({ current_value: Math.max(0, current) })
    .eq("id", id);
  refresh();
}

export async function deleteWeeklyTarget(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("weekly_targets").delete().eq("id", id);
  refresh();
}
