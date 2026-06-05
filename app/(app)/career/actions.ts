"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/career");
  revalidatePath("/");
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

// ---------- Applications ----------
export async function addApplication(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  if (!company) return;
  const supabase = await createClient();
  await supabase.from("applications").insert({
    company,
    role: String(formData.get("role") ?? "") || null,
    status: String(formData.get("status") ?? "applied"),
    applied_date: String(formData.get("applied_date") || "") || null,
    deadline: String(formData.get("deadline") || "") || null,
    follow_up_date: String(formData.get("follow_up_date") || "") || null,
    location: String(formData.get("location") ?? "") || null,
    work_mode: String(formData.get("work_mode") ?? "") || null,
    link: String(formData.get("link") ?? "") || null,
    salary: String(formData.get("salary") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
  refresh();
}

export async function updateApplicationStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const supabase = await createClient();
  await supabase.from("applications").update({ status }).eq("id", id);
  refresh();
}

export async function deleteApplication(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("applications").delete().eq("id", id);
  refresh();
}

// ---------- Portfolio ----------
export async function addPortfolioTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await createClient();
  await supabase.from("portfolio_tasks").insert({
    title,
    project: String(formData.get("project") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
    priority: String(formData.get("priority") ?? "medium"),
    link: String(formData.get("link") ?? "") || null,
  });
  refresh();
}

export async function movePortfolioTask(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const supabase = await createClient();
  await supabase.from("portfolio_tasks").update({ status }).eq("id", id);
  refresh();
}

export async function deletePortfolioTask(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("portfolio_tasks").delete().eq("id", id);
  refresh();
}

// ---------- Study sessions ----------
export async function addStudySession(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("study_sessions").insert({
    session_date: String(formData.get("session_date") || "") || undefined,
    category: String(formData.get("category") ?? "") || null,
    topic: String(formData.get("topic") ?? "") || null,
    platform: String(formData.get("platform") ?? "") || null,
    problems_solved: numberOrNull(formData.get("problems_solved")),
    difficulty: String(formData.get("difficulty") ?? "") || null,
    duration_min: numberOrNull(formData.get("duration_min")),
    notes: String(formData.get("notes") ?? "") || null,
  });
  refresh();
}

export async function deleteStudySession(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("study_sessions").delete().eq("id", id);
  refresh();
}
