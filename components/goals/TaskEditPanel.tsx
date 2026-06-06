"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { SlidePanel } from "@/components/goals/SlidePanel";
import { Button } from "@/components/ui/Button";
import { PRIORITIES, type Priority } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { type EditableTask } from "@/components/goals/TaskRow";

const PANEL_PRIORITY: Record<Priority, string> = {
  low: "border-[#3a3a3a] bg-[#1f1f1f] text-muted",
  medium: "border-[#3a3a3a] bg-[#1f1f1f] text-text",
  high: "border-amber-500/50 bg-amber-500/15 text-amber-500",
  urgent: "border-red-400/50 bg-red-400/15 text-red-400",
};

export type TaskPatch = {
  title: string;
  priority: Priority;
  due_date: string;
  notes: string;
};

export function TaskEditPanel({
  open,
  task,
  formId,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  task: EditableTask | null;
  /** Unique per panel instance so the footer Save button (outside the form)
   *  targets the right form via the HTML `form` attribute. */
  formId: string;
  onClose: () => void;
  onSave: (t: EditableTask, patch: TaskPatch) => void;
  onDelete: (t: EditableTask) => void;
}) {
  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Edit task"
      footer={
        task ? (
          <div className="space-y-2">
            <Button
              type="submit"
              form={formId}
              className="w-full bg-amber-500 text-black hover:bg-amber-400"
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => {
                onDelete(task);
                onClose();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-400/30 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        ) : null
      }
    >
      {task ? (
        <TaskEditFields
          key={task.id}
          task={task}
          formId={formId}
          onSubmit={(patch) => {
            onSave(task, patch);
            onClose();
          }}
        />
      ) : null}
    </SlidePanel>
  );
}

/** Mounts fresh per open, so useState initialisers seed from the task —
 *  no effect/ref syncing needed. */
function TaskEditFields({
  task,
  formId,
  onSubmit,
}: {
  task: EditableTask;
  formId: string;
  onSubmit: (patch: TaskPatch) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [due, setDue] = useState(task.due_date);
  const [notes, setNotes] = useState(task.notes ?? "");

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        const tt = title.trim();
        if (!tt) return;
        onSubmit({ title: tt, priority, due_date: due, notes: notes.trim() });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 w-full rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-text focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
        <div className="grid grid-cols-4 gap-1.5">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "h-10 rounded-lg border text-xs font-medium capitalize transition-colors",
                priority === p
                  ? PANEL_PRIORITY[p]
                  : "border-[#272727] bg-transparent text-muted/70 hover:text-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {!task.weekly_todo ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Due date</label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="h-11 w-full rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-text focus:border-amber-500 focus:outline-none"
          />
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="min-h-24 w-full resize-y rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-amber-500 focus:outline-none"
        />
      </div>
    </form>
  );
}
