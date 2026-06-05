"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Check, CalendarDays, Trash2, PartyPopper } from "lucide-react";
import { PriorityBadge } from "@/components/goals/PriorityBadge";
import { type Priority } from "@/lib/constants";
import { addDaysISO, weekdayOf } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import {
  addTask,
  toggleTask,
  pushTaskToDate,
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

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

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
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  // Close the date picker on outside click / Escape.
  useEffect(() => {
    if (!pickerFor) return;
    function onDown(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-task-picker]")) setPickerFor(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerFor(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerFor]);

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

  function onMove(t: T, date: string) {
    setPickerFor(null);
    if (date === today) return; // already due today — nothing to do
    startTransition(async () => {
      dispatch({ kind: "remove", id: t.id });
      const fd = new FormData();
      fd.set("id", t.id);
      fd.set("due_date", date);
      await pushTaskToDate(fd);
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
                  <div className="relative" data-task-picker>
                    <button
                      type="button"
                      onClick={() =>
                        setPickerFor((cur) => (cur === t.id ? null : t.id))
                      }
                      title="Move to date"
                      aria-label="Move to date"
                      className={cn(
                        "rounded-md p-1.5 transition-colors hover:bg-[#1f1f1f] hover:text-text",
                        pickerFor === t.id ? "text-amber-500" : "text-muted",
                      )}
                    >
                      <CalendarDays className="size-4" />
                    </button>
                    {pickerFor === t.id ? (
                      <DatePicker today={today} onPick={(d) => onMove(t, d)} />
                    ) : null}
                  </div>
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

function DatePicker({
  today,
  onPick,
}: {
  today: string;
  onPick: (date: string) => void;
}) {
  // Next 14 days as a 2×7 grid.
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i));

  return (
    <div className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3 shadow-xl">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        Move task to
      </p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dom = Number(d.slice(8, 10));
          const isToday = i === 0;
          const isTomorrow = i === 1;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              title={
                isToday ? "Today" : isTomorrow ? "Tomorrow" : d
              }
              className={cn(
                "flex min-h-11 flex-col items-center justify-center rounded-lg border text-xs transition-colors",
                isToday
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-500"
                  : "border-[#2a2a2a] bg-[#141414] text-text hover:border-amber-500 hover:bg-[#1f1f1f]",
              )}
            >
              <span className="text-[9px] uppercase leading-none text-muted">
                {DOW[weekdayOf(d)]}
              </span>
              <span className="mt-0.5 text-sm font-semibold leading-none tabular-nums">
                {dom}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
