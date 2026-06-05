"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, ChevronRight, Trash2, PartyPopper } from "lucide-react";
import { PriorityBadge } from "@/components/goals/PriorityBadge";
import { type Priority } from "@/lib/constants";
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
const sortTasks = (a: T, b: T) => {
  // Done tasks sink to the bottom; otherwise order by priority.
  if ((a.status === "done") !== (b.status === "done")) {
    return a.status === "done" ? 1 : -1;
  }
  return RANK[a.priority] - RANK[b.priority];
};

export function TodayTasks({
  today,
  todayTasks,
}: {
  today: string;
  todayTasks: T[];
}) {
  const [items, dispatch] = useOptimistic(todayTasks, reducer);
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  const doneCount = items.filter((t) => t.status === "done").length;
  const allDone = items.length > 0 && doneCount === items.length;

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

  function onDelete(t: T) {
    startTransition(async () => {
      dispatch({ kind: "remove", id: t.id });
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
      priority: "medium",
      status: "todo",
      due_date: today,
    };
    startTransition(async () => {
      dispatch({ kind: "add", task: temp });
      const fd = new FormData();
      fd.set("title", tt);
      fd.set("priority", "medium");
      fd.set("due_date", today);
      await addTask(fd);
    });
  }

  return (
    <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Today&apos;s tasks
        </h2>
        <span className="text-sm tabular-nums text-muted">
          {doneCount} / {items.length}
        </span>
      </div>

      {allDone ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3.5 text-green-400">
          <PartyPopper className="size-5" />
          <span className="text-sm font-bold tracking-wide">ALL DONE — SOLID DAY</span>
        </div>
      ) : (
        <ul className="divide-y divide-[#1f1f1f]">
          {[...items].sort(sortTasks).map((t) => {
            const done = t.status === "done";
            return (
              <li
                key={t.id}
                className="group flex items-center gap-3 px-1 py-[11px]"
              >
                <button
                  type="button"
                  onClick={() => onToggle(t)}
                  aria-label="Toggle task"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    done
                      ? "border-green-400 bg-green-400 text-black"
                      : "border-[#3a3a3a] hover:border-amber-500",
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
                    className="rounded-md p-1.5 text-muted transition-colors hover:bg-[#1f1f1f] hover:text-text"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDelete(t)}
                  title="Delete"
                  className="rounded-md p-1.5 text-muted opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}

          {items.length === 0 ? (
            <li className="px-1 py-3 text-sm text-muted">
              Nothing yet — add your first task below.
            </li>
          ) : null}
        </ul>
      )}

      {/* Inline add */}
      <form
        onSubmit={onAdd}
        className="mt-2 flex items-center gap-3 border-t border-[#1f1f1f] px-1 pt-3"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-dashed border-[#3a3a3a]" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 bg-transparent text-sm placeholder:text-muted/60 focus:outline-none"
        />
      </form>
    </section>
  );
}
