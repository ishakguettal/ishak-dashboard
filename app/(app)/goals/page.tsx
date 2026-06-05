import {
  Check,
  Trash2,
  ChevronRight,
  ListTodo,
  Target,
  CalendarRange,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Input, Select, Textarea, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormModal } from "@/components/ui/FormModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityBadge } from "@/components/goals/PriorityBadge";
import { PRIORITIES, type Priority } from "@/lib/constants";
import { todayISO, weekStartISO, relativeDay } from "@/lib/utils/date";
import { titleize } from "@/lib/utils/format";
import type { Task, SummerGoal, WeeklyTarget } from "@/lib/types/db";
import {
  addTask,
  toggleTask,
  pushToTomorrow,
  deleteTask,
  addSummerGoal,
  updateGoalProgress,
  deleteSummerGoal,
  addWeeklyTarget,
  updateWeeklyTarget,
  deleteWeeklyTarget,
} from "./actions";

export const dynamic = "force-dynamic";

const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default async function GoalsPage() {
  const supabase = await createClient();
  const today = todayISO();
  const week = weekStartISO();

  const [tasksRes, goalsRes, targetsRes] = await Promise.all([
    supabase.from("tasks").select("*").or(`status.eq.todo,due_date.eq.${today}`),
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

  const sort = (a: Task, b: Task) =>
    RANK[a.priority] - RANK[b.priority] || a.due_date.localeCompare(b.due_date);
  const overdue = tasks
    .filter((t) => t.status === "todo" && t.due_date < today)
    .sort(sort);
  const todayTasks = tasks.filter((t) => t.due_date === today).sort(sort);
  const upcoming = tasks
    .filter((t) => t.status === "todo" && t.due_date > today)
    .sort(sort);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Goals &amp; Tasks</h1>
        <p className="mt-0.5 text-sm text-muted">
          Plan the day, track the summer.
        </p>
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader title="To-do" icon={ListTodo} />
        <form
          action={addTask}
          className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            name="title"
            placeholder="Add a task…"
            required
            className="flex-1"
          />
          <div className="flex gap-2">
            <Select name="priority" defaultValue="medium" className="w-28">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {titleize(p)}
                </option>
              ))}
            </Select>
            <Input
              name="due_date"
              type="date"
              defaultValue={today}
              className="w-40"
            />
            <SubmitButton>Add</SubmitButton>
          </div>
        </form>

        {overdue.length + todayTasks.length + upcoming.length === 0 ? (
          <EmptyState icon={ListTodo} title="No tasks yet" hint="Add one above." />
        ) : (
          <div className="space-y-4">
            {overdue.length > 0 && (
              <TaskGroup label="Overdue" tone="text-danger" tasks={overdue} today={today} />
            )}
            <TaskGroup label="Today" tasks={todayTasks} today={today} emptyHint="Nothing due today." />
            {upcoming.length > 0 && (
              <TaskGroup label="Upcoming" tone="text-muted" tasks={upcoming} today={today} />
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Summer goals */}
        <Card>
          <CardHeader
            title="Summer goals"
            icon={Target}
            action={
              <FormModal title="New summer goal" action={addSummerGoal}>
                <Field label="Title">
                  <Input name="title" required placeholder="e.g. Ship portfolio v2" />
                </Field>
                <Field label="Description">
                  <Textarea name="description" placeholder="Optional details" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <Input name="category" placeholder="e.g. Career" />
                  </Field>
                  <Field label="Target date">
                    <Input name="target_date" type="date" />
                  </Field>
                </div>
              </FormModal>
            }
          />
          {goals.length === 0 ? (
            <EmptyState icon={Target} title="No summer goals" hint="Set a longer-horizon goal." />
          ) : (
            <div className="space-y-3">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </div>
          )}
        </Card>

        {/* Weekly targets */}
        <Card>
          <CardHeader
            title="Weekly targets"
            icon={CalendarRange}
            action={
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
            }
          />
          {targets.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No targets this week"
              hint="Track a weekly metric."
            />
          ) : (
            <div className="space-y-3">
              {targets.map((t) => (
                <TargetRow key={t.id} target={t} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TaskGroup({
  label,
  tasks,
  today,
  tone = "text-muted",
  emptyHint,
}: {
  label: string;
  tasks: Task[];
  today: string;
  tone?: string;
  emptyHint?: string;
}) {
  return (
    <div>
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${tone}`}>
        {label}
      </p>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted">{emptyHint}</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task, today }: { task: Task; today: string }) {
  const done = task.status === "done";
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2">
      <form action={toggleTask} className="flex">
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="status" value={task.status} />
        <button
          type="submit"
          aria-label={done ? "Mark as not done" : "Mark as done"}
          className={
            "flex size-5 items-center justify-center rounded-md border transition-colors " +
            (done
              ? "border-success bg-success text-bg"
              : "border-border hover:border-primary")
          }
        >
          {done ? <Check className="size-3.5" /> : null}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={"truncate text-sm " + (done ? "text-muted line-through" : "text-text")}>
          {task.title}
        </p>
        {task.due_date !== today ? (
          <p className="text-xs text-muted">{relativeDay(task.due_date, today)}</p>
        ) : null}
      </div>

      <PriorityBadge priority={task.priority} />

      {!done ? (
        <form action={pushToTomorrow}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="due_date" value={task.due_date} />
          <button
            type="submit"
            title="Push to tomorrow"
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
          >
            <ChevronRight className="size-4" />
          </button>
        </form>
      ) : null}

      <form action={deleteTask}>
        <input type="hidden" name="id" value={task.id} />
        <button
          type="submit"
          title="Delete"
          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      </form>
    </li>
  );
}

function GoalCard({ goal }: { goal: SummerGoal }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{goal.title}</p>
          {goal.description ? (
            <p className="text-xs text-muted">{goal.description}</p>
          ) : null}
          <div className="mt-1 flex gap-2 text-xs text-muted">
            {goal.category ? <span>{goal.category}</span> : null}
            {goal.target_date ? <span>· by {relativeDay(goal.target_date)}</span> : null}
          </div>
        </div>
        <form action={deleteSummerGoal}>
          <input type="hidden" name="id" value={goal.id} />
          <button
            type="submit"
            className="rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={goal.progress} className="flex-1" />
        <form action={updateGoalProgress} className="flex items-center gap-1">
          <input type="hidden" name="id" value={goal.id} />
          <input
            name="progress"
            type="number"
            min={0}
            max={100}
            defaultValue={goal.progress}
            className="w-16 rounded-md border border-border bg-surface-2 px-2 py-1 text-sm tabular-nums"
          />
          <span className="text-xs text-muted">%</span>
          <button
            type="submit"
            className="rounded-md bg-surface-2 px-2 py-1 text-xs hover:bg-surface-2/70"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

function TargetRow({ target }: { target: WeeklyTarget }) {
  const pct = target.target_value
    ? Math.min(100, (target.current_value / target.target_value) * 100)
    : 0;
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{target.title}</p>
        <form action={deleteWeeklyTarget}>
          <input type="hidden" name="id" value={target.id} />
          <button
            type="submit"
            className="rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Progress value={pct} className="flex-1" />
        <form action={updateWeeklyTarget} className="flex items-center gap-1">
          <input type="hidden" name="id" value={target.id} />
          <input
            name="current_value"
            type="number"
            step="any"
            defaultValue={target.current_value}
            className="w-16 rounded-md border border-border bg-surface-2 px-2 py-1 text-sm tabular-nums"
          />
          <span className="whitespace-nowrap text-xs text-muted">
            / {target.target_value ?? "—"} {target.unit}
          </span>
          <button
            type="submit"
            className="rounded-md bg-surface-2 px-2 py-1 text-xs hover:bg-surface-2/70"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
