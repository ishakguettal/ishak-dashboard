import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Input, Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { TaskBoard } from "@/components/goals/TaskBoard";
import { WeeklyTodos } from "@/components/goals/WeeklyTodos";
import { SummerGoals } from "@/components/goals/SummerGoals";
import { WeeklyTargets } from "@/components/goals/WeeklyTargets";
import { todayISO, weekStartISO, weekEndISO } from "@/lib/utils/date";
import type { Task, SummerGoal, WeeklyTarget } from "@/lib/types/db";
import { addWeeklyTarget } from "./actions";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const supabase = await createClient();
  const today = todayISO();
  const week = weekStartISO();
  const weekSunday = weekEndISO(today);

  const [tasksRes, goalsRes, targetsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .or(
        `status.eq.todo,due_date.eq.${today},and(weekly_todo.eq.true,due_date.eq.${weekSunday})`,
      ),
    supabase
      .from("summer_goals")
      .select("*")
      .neq("status", "dropped")
      .order("created_at"),
    supabase
      .from("weekly_targets")
      .select("*")
      .eq("week_start", week)
      .order("created_at"),
  ]);

  const tasks = (tasksRes.data ?? []) as Task[];
  const goals = (goalsRes.data ?? []) as SummerGoal[];
  const targets = (targetsRes.data ?? []) as WeeklyTarget[];

  const allTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    status: t.status,
    notes: t.notes,
    weekly_todo: t.weekly_todo,
  }));
  const dayTasks = allTasks.filter((t) => !t.weekly_todo);
  const weeklyTasks = allTasks.filter((t) => t.weekly_todo);

  const initialGoals = goals.map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    target_date: g.target_date,
    description: g.description,
    progress: g.progress,
    status: g.status,
  }));

  const initialTargets = targets.map((t) => ({
    id: t.id,
    title: t.title,
    unit: t.unit,
    target_value: t.target_value,
    current_value: t.current_value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Goals &amp; Tasks</h1>
        <p className="mt-0.5 text-sm text-muted">
          Plan the day, track the summer.
        </p>
      </div>

      <TaskBoard initialTasks={dayTasks} today={today} />

      <WeeklyTodos initialTasks={weeklyTasks} weekSunday={weekSunday} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SummerGoals initialGoals={initialGoals} />

        {/* Weekly targets */}
        <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-4 text-muted" />
              <h2 className="text-sm font-semibold text-text">Weekly targets</h2>
            </div>
            <FormModal title="New weekly target" action={addWeeklyTarget}>
              <Field label="Title">
                <Input name="title" required placeholder="e.g. Gym sessions" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Target value">
                  <Input name="target_value" type="number" step="any" placeholder="5" />
                </Field>
                <Field label="Unit">
                  <Input name="unit" placeholder="sessions" />
                </Field>
              </div>
            </FormModal>
          </div>

          <WeeklyTargets initialTargets={initialTargets} />
        </section>
      </div>
    </div>
  );
}
