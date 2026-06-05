"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { type Priority } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { addTask, deleteTask } from "@/app/(app)/goals/actions";

type T = {
  id: string;
  title: string;
  priority: Priority;
  status: "todo" | "done";
  due_date: string;
};

type Act = { kind: "remove"; id: string } | { kind: "add"; task: T };

function reducer(state: T[], a: Act): T[] {
  switch (a.kind) {
    case "remove":
      return state.filter((t) => t.id !== a.id);
    case "add":
      return [...state, a.task];
  }
}

export function PlanTomorrow({
  tomorrow,
  tomorrowTasks,
}: {
  tomorrow: string;
  tomorrowTasks: T[];
}) {
  const [items, dispatch] = useOptimistic(tomorrowTasks, reducer);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

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
      due_date: tomorrow,
    };
    startTransition(async () => {
      dispatch({ kind: "add", task: temp });
      const fd = new FormData();
      fd.set("title", tt);
      fd.set("priority", "medium");
      fd.set("due_date", tomorrow);
      await addTask(fd);
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

  return (
    <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] px-5 py-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-text"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
          />
          Plan tomorrow
          {items.length > 0 ? (
            <span className="rounded-full bg-[#1f1f1f] px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
              {items.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-400"
        >
          <Plus className="size-3.5" /> add
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-1">
          {items.map((t) => (
            <div key={t.id} className="group flex items-center gap-2.5 px-1 py-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-amber-500/70" />
              <span className="min-w-0 flex-1 truncate text-sm text-text">
                {t.title}
              </span>
              <button
                type="button"
                onClick={() => onDelete(t)}
                title="Delete"
                className="rounded p-1 text-muted opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <form
            onSubmit={onAdd}
            className="flex items-center gap-2.5 px-1 pt-1"
          >
            <span className="size-1.5 shrink-0 rounded-full border border-dashed border-[#3a3a3a]" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add for tomorrow…"
              className="flex-1 bg-transparent text-sm placeholder:text-muted/60 focus:outline-none"
            />
          </form>
        </div>
      ) : null}
    </section>
  );
}
