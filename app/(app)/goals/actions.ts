"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  todayISO,
  addDaysISO,
  weekStartISO,
  weekEndISO,
} from "@/lib/utils/date";

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

/** A weekly to-do: no specific day, just "before Sunday". Pinned to this
 *  week's Sunday so grouping + Monday carry-over have something to key off. */
export async function addWeeklyTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await createClient();
  await supabase.from("tasks").insert({
    title,
    priority: String(formData.get("priority") ?? "medium"),
    due_date: weekEndISO(),
    weekly_todo: true,
  });
  refresh();
}

/** Edit a task from the slide-in panel. Only touches due_date when one is
 *  supplied (the panel hides the date field for weekly to-dos). */
export async function updateTask(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const due = String(formData.get("due_date") ?? "");
  const update: Record<string, unknown> = {
    title,
    priority: String(formData.get("priority") ?? "medium"),
    notes: String(formData.get("notes") ?? "") || null,
  };
  if (due) update.due_date = due;
  const supabase = await createClient();
  await supabase.from("tasks").update(update).eq("id", id);
  refresh();
}

/** Inline priority cycle on a task row. */
export async function setTaskPriority(formData: FormData) {
  const id = String(formData.get("id"));
  const priority = String(formData.get("priority") ?? "medium");
  const supabase = await createClient();
  await supabase.from("tasks").update({ priority }).eq("id", id);
  refresh();
}

/** Monday carry-over: keep last week's unfinished weekly to-dos by pulling
 *  them into the current week. */
export async function carryOverWeeklyTodos() {
  const supabase = await createClient();
  const sunday = weekEndISO();
  await supabase
    .from("tasks")
    .update({ due_date: sunday })
    .eq("weekly_todo", true)
    .eq("status", "todo")
    .lt("due_date", sunday);
  refresh();
}

/** Monday carry-over: drop last week's unfinished weekly to-dos. */
export async function dropWeeklyTodos() {
  const supabase = await createClient();
  const sunday = weekEndISO();
  await supabase
    .from("tasks")
    .delete()
    .eq("weekly_todo", true)
    .eq("status", "todo")
    .lt("due_date", sunday);
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

/** Move a task to an explicit due date (used by the Daily HQ date picker). */
export async function pushTaskToDate(formData: FormData) {
  const id = String(formData.get("id"));
  const due_date = String(formData.get("due_date"));
  if (!id || !due_date) return;
  const supabase = await createClient();
  await supabase.from("tasks").update({ due_date }).eq("id", id);
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
  const progress = Math.max(
    0,
    Math.min(100, Math.round(Number(formData.get("progress") ?? 0))),
  );
  const supabase = await createClient();
  await supabase.from("summer_goals").insert({
    title,
    description: String(formData.get("description") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    target_date: String(formData.get("target_date") || "") || null,
    progress,
    status: progress >= 100 ? "done" : "active",
  });
  refresh();
}

/** Full edit from the slide-in panel: title, category, target date, progress,
 *  status and notes. */
export async function updateSummerGoal(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const progress = Math.max(
    0,
    Math.min(100, Math.round(Number(formData.get("progress") ?? 0))),
  );
  const statusRaw = String(formData.get("status") ?? "active");
  const status = ["active", "done", "dropped"].includes(statusRaw)
    ? statusRaw
    : "active";
  const supabase = await createClient();
  await supabase
    .from("summer_goals")
    .update({
      title,
      category: String(formData.get("category") ?? "") || null,
      target_date: String(formData.get("target_date") || "") || null,
      description: String(formData.get("notes") ?? "") || null,
      progress,
      status,
    })
    .eq("id", id);
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
