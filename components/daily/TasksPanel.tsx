"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  Check,
  ChevronRight,
  Trash2,
  Plus,
  ChevronDown,
  CalendarPlus,
  PartyPopper,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/goals/PriorityBadge";
import { PRIORITIES, type Priority } from "@/lib/constants";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  addTask,
  toggleTask,
  pushToTomorrow,
  deleteTask,
} from "@/app/(app)/goals/actions";

type T = {
  id: string;
  title: string;
  priority: Priority;
  status: "todo" | "done";
  due_date: string;
};

type Act =
  | { kind: "toggle"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "add"; task: T };

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
  }
}

const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const sortTasks = (a: T, b: T) => RANK[a.priority] - RANK[b.priority];

export function TasksPanel({
  today,
  tomorrow,
  todayTasks,
  tomorrowTasks,
}: {
  today: string;
  tomorrow: string;
  todayTasks: T[];
  tomorrowTasks: T[];
}) {
  const [items, dispatch] = useOptimistic(todayTasks, reducer);
  const [tmrw, dispatchTmrw] = useOptimistic(tomorrowTasks, reducer);
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [planOpen, setPlanOpen] = useState(false);
  const [tmrwTitle, setTmrwTitle] = useState("");

  const allDone = items.length > 0 && items.every((t) => t.status === "done");

  function onToggle(t: T) {
    startTransition(async () => {
      dispatch({ kind: "toggle", id: t.id });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("status", t.status);
      await toggleTask(fd);
    });
  }

  function onPush(t: T) {
    startTransition(async () => {
      dispatch({ kind: "remove", id: t.id });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("due_date", t.due_date);
      await pushToTomorrow(fd);
    });
  }

  function onDelete(t: T, where: "today" | "tomorrow") {
    startTransition(async () => {
      (where === "today" ? dispatch : dispatchTmrw)({ kind: "remove", id: t.id });
      const fd = new FormData();
      fd.set("id", t.id);
      await deleteTask(fd);
    });
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const tt = title.trim();
    if (!tt) return;
    setTitle("");
    const temp: T = {
      id: "temp-" + Date.now(),
      title: tt,
      priority,
      status: "todo",
      due_date: today,
    };
    startTransition(async () => {
      dispatch({ kind: "add", task: temp });
      const fd = new FormData();
      fd.set("title", tt);
      fd.set("priority", priority);
      fd.set("due_date", today);
      await addTask(fd);
    });
  }

  function onAddTomorrow(e: React.FormEvent) {
    e.preventDefault();
    const tt = tmrwTitle.trim();
    if (!tt) return;
    setTmrwTitle("");
    const temp: T = {
      id: "temp-" + Date.now(),
      title: tt,
      priority: "medium",
      status: "todo",
      due_date: tomorrow,
    };
    startTransition(async () => {
      dispatchTmrw({ kind: "add", task: temp });
      const fd = new FormData();
      fd.set("title", tt);
      fd.set("priority", "medium");
      fd.set("due_date", tomorrow);
      await addTask(fd);
    });
  }

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Today&apos;s tasks</h2>
        <span className="text-xs text-muted">
          {items.filter((t) => t.status === "done").length}/{items.length}
        </span>
      </div>

      {allDone ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-500">
          <PartyPopper className="size-5" />
          <span className="text-sm font-bold tracking-wide">
            ALL DONE — SOLID DAY
          </span>
        </div>
      ) : items.length === 0 ? (
        <p className="py-2 text-sm text-muted">No tasks today. Add one below.</p>
      ) : (
        <ul className="space-y-1.5">
          {[...items].sort(sortTasks).map((t) => {
            const done = t.status === "done";
            return (
              <li
                key={t.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onToggle(t)}
                  aria-label="Toggle"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    done
                      ? "border-green-500 bg-green-500 text-black"
                      : "border-border hover:border-amber-500",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : null}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    done ? "text-muted line-through" : "text-text",
                  )}
                >
                  {t.title}
                </span>
                <PriorityBadge priority={t.priority} />
                {!done ? (
                  <button
                    type="button"
                    onClick={() => onPush(t)}
                    title="Push to tomorrow"
                    className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDelete(t, "today")}
                  title="Delete"
                  className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Inline add */}
      <form onSubmit={onAdd} className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/70 focus:border-amber-500 focus:outline-none"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {titleize(p)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="flex items-center justify-center rounded-lg bg-amber-500 px-3 text-black hover:bg-amber-400"
        >
          <Plus className="size-4" />
        </button>
      </form>

      {/* Plan tomorrow */}
      <div className="mt-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setPlanOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm text-muted hover:text-text"
        >
          <span className="flex items-center gap-2">
            <CalendarPlus className="size-4" /> Plan tomorrow
            {tmrw.length > 0 ? (
              <span className="rounded-full bg-surface-2 px-1.5 text-xs">
                {tmrw.length}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn("size-4 transition-transform", planOpen && "rotate-180")}
          />
        </button>

        {planOpen ? (
          <div className="mt-2 space-y-1.5">
            {tmrw.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/30 px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <PriorityBadge priority={t.priority} />
                <button
                  type="button"
                  onClick={() => onDelete(t, "tomorrow")}
                  className="rounded p-1 text-muted hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <form onSubmit={onAddTomorrow} className="flex gap-2">
              <input
                value={tmrwTitle}
                onChange={(e) => setTmrwTitle(e.target.value)}
                placeholder="Add for tomorrow…"
                className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/70 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center rounded-lg border border-border bg-surface-2 px-3 hover:border-amber-500"
              >
                <Plus className="size-4" />
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
