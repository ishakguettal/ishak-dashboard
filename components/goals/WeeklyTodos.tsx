"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CalendarCheck } from "lucide-react";
import { PRIORITIES, type Priority } from "@/lib/constants";
import {
  TaskRow,
  byPriority,
  doneLast,
  type EditableTask as T,
} from "@/components/goals/TaskRow";
import { TaskEditPanel, type TaskPatch } from "@/components/goals/TaskEditPanel";
import {
  addWeeklyTodo,
  toggleTask,
  setTaskPriority,
  updateTask,
  deleteTask,
  carryOverWeeklyTodos,
  dropWeeklyTodos,
} from "@/app/(app)/goals/actions";

type Act =
  | { kind: "toggle"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "removeMany"; ids: string[] }
  | { kind: "add"; task: T }
  | { kind: "priority"; id: string; priority: Priority }
  | { kind: "update"; id: string; patch: Partial<T> }
  | { kind: "carryOver"; ids: string[]; to: string };

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
    case "removeMany":
      return state.filter((t) => !a.ids.includes(t.id));
    case "add":
      return [...state, a.task];
    case "priority":
      return state.map((t) =>
        t.id === a.id ? { ...t, priority: a.priority } : t,
      );
    case "update":
      return state.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t));
    case "carryOver":
      return state.map((t) =>
        a.ids.includes(t.id) ? { ...t, due_date: a.to } : t,
      );
  }
}

export function WeeklyTodos({
  initialTasks,
  weekSunday,
}: {
  initialTasks: T[];
  weekSunday: string;
}) {
  const [items, dispatch] = useOptimistic(initialTasks, reducer);
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<T | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const openEdit = (t: T) => {
    setEditing(t);
    setEditOpen(true);
  };

  const weekly = items
    .filter((t) => t.due_date === weekSunday)
    .sort(doneLast);
  const stale = items
    .filter((t) => t.status === "todo" && t.due_date < weekSunday)
    .sort(byPriority);

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
        patch: { title: patch.title, priority: patch.priority, notes: patch.notes || null },
      });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("title", patch.title);
      fd.set("priority", patch.priority);
      fd.set("notes", patch.notes);
      // weekly to-dos keep their pinned Sunday due_date — don't send one.
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

  function onCarryOver() {
    const ids = stale.map((t) => t.id);
    startTransition(async () => {
      dispatch({ kind: "carryOver", ids, to: weekSunday });
      await carryOverWeeklyTodos();
    });
  }

  function onDropStale() {
    const ids = stale.map((t) => t.id);
    startTransition(async () => {
      dispatch({ kind: "removeMany", ids });
      await dropWeeklyTodos();
    });
  }

  function onAdd(title: string) {
    const temp: T = {
      id: "temp-" + Date.now(),
      title,
      priority: "medium",
      due_date: weekSunday,
      status: "todo",
      notes: null,
      weekly_todo: true,
    };
    startTransition(async () => {
      dispatch({ kind: "add", task: temp });
      const fd = new FormData();
      fd.set("title", title);
      fd.set("priority", "medium");
      await addWeeklyTodo(fd);
    });
  }

  return (
    <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] p-5">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="size-4 text-muted" />
          <h2 className="text-sm font-semibold text-text">This Week</h2>
        </div>
        <WeeklyAddForm onAdd={onAdd} />
      </div>

      {stale.length > 0 ? (
        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs font-medium text-amber-500">
            Carry over {stale.length} unfinished{" "}
            {stale.length === 1 ? "to-do" : "to-dos"} from last week?
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {stale.map((t) => (
              <li key={t.id} className="truncate text-xs text-muted">
                · {t.title}
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={onCarryOver}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Yes, keep
            </button>
            <button
              type="button"
              onClick={onDropStale}
              className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-400/40 hover:text-red-400"
            >
              No, delete
            </button>
          </div>
        </div>
      ) : null}

      {weekly.length > 0 ? (
        <ul className="mt-1 divide-y divide-[#1f1f1f]">
          {weekly.map((t) => (
            <TaskRow
              key={t.id}
              t={t}
              onToggle={onToggle}
              onCycle={onCyclePriority}
              onEdit={openEdit}
            />
          ))}
        </ul>
      ) : (
        <p className="px-1 py-3 text-sm text-muted">No weekly to-dos this week</p>
      )}

      <TaskEditPanel
        open={editOpen}
        task={editing}
        formId="weekly-edit-form"
        onClose={() => setEditOpen(false)}
        onSave={onSaveEdit}
        onDelete={onDelete}
      />
    </section>
  );
}

function WeeklyAddForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const tt = title.trim();
        if (!tt) return;
        setTitle("");
        onAdd(tt);
      }}
      className="flex w-full items-center gap-2 sm:w-80"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a weekly to-do…"
        className="h-11 flex-1 rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-text placeholder:text-muted/60 focus:border-amber-500 focus:outline-none sm:h-10"
      />
      <button
        type="submit"
        className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-amber-400 sm:h-10"
      >
        Add
      </button>
    </form>
  );
}
