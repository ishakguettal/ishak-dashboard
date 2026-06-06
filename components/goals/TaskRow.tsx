"use client";

import { Check, Pencil } from "lucide-react";
import { PriorityBadge } from "@/components/goals/PriorityBadge";
import { type Priority } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

export type EditableTask = {
  id: string;
  title: string;
  priority: Priority;
  due_date: string;
  status: "todo" | "done";
  notes: string | null;
  weekly_todo: boolean;
};

export const RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const byPriority = (a: EditableTask, b: EditableTask) =>
  RANK[a.priority] - RANK[b.priority] || a.due_date.localeCompare(b.due_date);

// Done sinks to the bottom; otherwise by priority.
export const doneLast = (a: EditableTask, b: EditableTask) => {
  if ((a.status === "done") !== (b.status === "done"))
    return a.status === "done" ? 1 : -1;
  return byPriority(a, b);
};

export function TaskRow({
  t,
  hint,
  onToggle,
  onCycle,
  onEdit,
}: {
  t: EditableTask;
  hint?: string;
  onToggle: (t: EditableTask) => void;
  onCycle: (t: EditableTask) => void;
  onEdit: (t: EditableTask) => void;
}) {
  const done = t.status === "done";
  return (
    <li className="group flex items-center gap-3 py-[11px]">
      <button
        type="button"
        onClick={() => onToggle(t)}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          done
            ? "border-green-400 bg-green-400 text-black"
            : "border-[#3a3a3a] hover:border-amber-500",
        )}
      >
        {done ? <Check className="size-3.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            done ? "text-muted line-through" : "text-text",
          )}
        >
          {t.title}
        </p>
        {hint ? <p className="text-[11px] text-danger">{hint}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => onCycle(t)}
        title="Cycle priority"
        aria-label="Cycle priority"
        className="rounded-full transition-transform hover:scale-105"
      >
        <PriorityBadge priority={t.priority} />
      </button>

      {/* Hidden until row hover on pointer devices; always visible on touch
          (where there is no hover state). */}
      <button
        type="button"
        onClick={() => onEdit(t)}
        title="Edit"
        aria-label="Edit task"
        className="flex size-11 items-center justify-center rounded-md text-muted opacity-0 transition-all hover:bg-[#1f1f1f] hover:text-text group-hover:opacity-100 [@media(hover:none)]:opacity-100 sm:size-8"
      >
        <Pencil className="size-4" />
      </button>
    </li>
  );
}
