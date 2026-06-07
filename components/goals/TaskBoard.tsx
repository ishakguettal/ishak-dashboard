"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ListTodo } from "lucide-react";
import { PRIORITIES, type Priority } from "@/lib/constants";
import { addDaysISO, daysUntil, relativeDay, weekdayOf } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { PriorityToggle } from "@/components/goals/PriorityToggle";
import {
  TaskRow,
  byPriority,
  doneLast,
  type EditableTask as T,
} from "@/components/goals/TaskRow";
import { TaskEditPanel, type TaskPatch } from "@/components/goals/TaskEditPanel";
import {
  addTask,
  toggleTask,
  setTaskPriority,
  updateTask,
  deleteTask,
} from "@/app/(app)/goals/actions";

type Act =
  | { kind: "toggle"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "add"; task: T }
  | { kind: "priority"; id: string; priority: Priority }
  | { kind: "update"; id: string; patch: Partial<T> };

function reducer(state: T[], a: Act): T[] {
  switch (a.kind) {
    case "toggle":
      return state.map((t) =>
        t.id === a.id
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t,
      );
    case "remove":
      return state.filter((t) => t.id !== a.id);
    case "add":
      return [...state, a.task];
    case "priority":
      return state.map((t) =>
        t.id === a.id ? { ...t, priority: a.priority } : t,
      );
    case "update":
      return state.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t));
  }
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function groupHeader(iso: string, today: string): string {
  const dom = Number(iso.slice(8, 10));
  const mon = MONTHS[Number(iso.slice(5, 7)) - 1];
  const label = `${DOW[weekdayOf(iso)]} ${dom} ${mon}`;
  return daysUntil(iso, today) === 1 ? `TOMORROW — ${label}` : label;
}

const LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#444]";

export function TaskBoard({
  initialTasks,
  today,
}: {
  initialTasks: T[];
  today: string;
}) {
  const [items, dispatch] = useOptimistic(initialTasks, reducer);
  const [, startTransition] = useTransition();
  // `editing` holds the row being edited; `editOpen` drives the slide animation.
  const [editing, setEditing] = useState<T | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const openEdit = (t: T) => {
    setEditing(t);
    setEditOpen(true);
  };

  // ---- partition (these tasks are all non-weekly) ----
  const overdue = items
    .filter((t) => t.status === "todo" && t.due_date < today)
    .sort(byPriority);
  const todayList = items
    .filter((t) => t.due_date === today)
    .sort(doneLast);
  const horizon = addDaysISO(today, 7);
  const upcoming = items
    .filter(
      (t) => t.status === "todo" && t.due_date > today && t.due_date <= horizon,
    )
    .sort(byPriority);

  // Group upcoming by date.
  const upcomingByDate = new Map<string, T[]>();
  for (const t of upcoming) {
    const bucket = upcomingByDate.get(t.due_date);
    if (bucket) bucket.push(t);
    else upcomingByDate.set(t.due_date, [t]);
  }
  const upcomingDates = [...upcomingByDate.keys()].sort();
  const collapseUpcoming = upcoming.length > 10 && !showUpcoming;

  // ---- mutations ----
  function onToggle(t: T) {
    startTransition(async () => {
      dispatch({ kind: "toggle", id: t.id });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("status", t.status);
      await toggleTask(fd);
    });
  }

  function onCyclePriority(t: T) {
    const next =
      PRIORITIES[(PRIORITIES.indexOf(t.priority) + 1) % PRIORITIES.length];
    startTransition(async () => {
      dispatch({ kind: "priority", id: t.id, priority: next });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("priority", next);
      await setTaskPriority(fd);
    });
  }

  function onSaveEdit(t: T, patch: TaskPatch) {
    startTransition(async () => {
      dispatch({
        kind: "update",
        id: t.id,
        patch: {
          title: patch.title,
          priority: patch.priority,
          notes: patch.notes || null,
          due_date: patch.due_date,
        },
      });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("title", patch.title);
      fd.set("priority", patch.priority);
      fd.set("notes", patch.notes);
      fd.set("due_date", patch.due_date);
      await updateTask(fd);
    });
  }

  function onDelete(t: T) {
    startTransition(async () => {
      dispatch({ kind: "remove", id: t.id });
      const fd = new FormData();
      fd.set("id", t.id);
      await deleteTask(fd);
    });
  }

  function addDated(title: string, priority: Priority, due_date: string) {
    const temp: T = {
      id: "temp-" + Date.now(),
      title,
      priority,
      due_date,
      status: "todo",
      notes: null,
      weekly_todo: false,
    };
    startTransition(async () => {
      dispatch({ kind: "add", task: temp });
      const fd = new FormData();
      fd.set("title", title);
      fd.set("priority", priority);
      fd.set("due_date", due_date);
      await addTask(fd);
    });
  }

  const renderRow = (t: T, hint?: string) => (
    <TaskRow
      key={t.id}
      t={t}
      hint={hint}
      onToggle={onToggle}
      onCycle={onCyclePriority}
      onEdit={openEdit}
    />
  );

  return (
    <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] p-5">
      <div className="mb-3 flex items-center gap-2">
        <ListTodo className="size-4 text-muted" />
        <h2 className="text-sm font-semibold text-text">To-do</h2>
      </div>

      {/* General add (dated) */}
      <AddDatedForm today={today} onAdd={addDated} />

      <div className="mt-4 space-y-5">
        {/* Overdue */}
        {overdue.length > 0 ? (
          <div>
            <p className={cn(LABEL, "mb-1.5 text-danger/70")}>Overdue</p>
            <ul className="divide-y divide-[#1f1f1f]">
              {overdue.map((t) => renderRow(t, relativeDay(t.due_date, today)))}
            </ul>
          </div>
        ) : null}

        {/* Today */}
        <div>
          <p className={cn(LABEL, "mb-1.5")}>Today</p>
          {todayList.length > 0 ? (
            <ul className="divide-y divide-[#1f1f1f]">
              {todayList.map((t) => renderRow(t))}
            </ul>
          ) : (
            <p className="px-1 py-2 text-sm text-muted">Nothing due today.</p>
          )}
        </div>

        {/* Upcoming (next 7 days, grouped) */}
        {upcoming.length > 0 ? (
          <div>
            {collapseUpcoming ? (
              <button
                type="button"
                onClick={() => setShowUpcoming(true)}
                className={cn(LABEL, "transition-colors hover:text-muted")}
              >
                Show upcoming ({upcoming.length})
              </button>
            ) : (
              <div className="space-y-3">
                {upcomingDates.map((d) => (
                  <div key={d}>
                    <p className={cn(LABEL, "mb-1.5")}>{groupHeader(d, today)}</p>
                    <ul className="divide-y divide-[#1f1f1f]">
                      {upcomingByDate.get(d)!.map((t) => renderRow(t))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <TaskEditPanel
        open={editOpen}
        task={editing}
        formId="task-edit-form"
        onClose={() => setEditOpen(false)}
        onSave={onSaveEdit}
        onDelete={onDelete}
      />
    </section>
  );
}

/* ---------- general dated add (title + priority + date) ---------- */
function AddDatedForm({
  today,
  onAdd,
}: {
  today: string;
  onAdd: (title: string, priority: Priority, due_date: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState(today);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const tt = title.trim();
        if (!tt) return;
        setTitle("");
        setPriority("medium");
        setDue(today);
        onAdd(tt, priority, due || today);
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="h-11 flex-1 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-text placeholder:text-muted/60 focus:border-amber-500 focus:outline-none sm:h-10"
      />
      <div className="flex flex-wrap items-center gap-2">
        <PriorityToggle value={priority} onChange={setPriority} className="px-1" />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="h-11 w-40 rounded-lg border border-[#272727] bg-[#0f0f0f] px-2 text-sm text-text focus:border-amber-500 focus:outline-none sm:h-10"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400 sm:h-10"
        >
          Add
        </button>
      </div>
    </form>
  );
}
