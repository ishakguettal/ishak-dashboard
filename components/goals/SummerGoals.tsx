"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Check, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { SlidePanel } from "@/components/goals/SlidePanel";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import {
  addSummerGoal,
  updateSummerGoal,
  deleteSummerGoal,
} from "@/app/(app)/goals/actions";

type G = {
  id: string;
  title: string;
  category: string | null;
  target_date: string | null;
  description: string | null;
  progress: number;
  status: "active" | "done" | "dropped";
};

type Act =
  | { kind: "add"; goal: G }
  | { kind: "remove"; id: string }
  | { kind: "update"; id: string; patch: Partial<G> };

function reducer(state: G[], a: Act): G[] {
  switch (a.kind) {
    case "add":
      return [...state, a.goal];
    case "remove":
      return state.filter((g) => g.id !== a.id);
    case "update":
      return state.map((g) => (g.id === a.id ? { ...g, ...a.patch } : g));
  }
}

const STATUSES = ["active", "done", "dropped"] as const;
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#444]";

export function SummerGoals({ initialGoals }: { initialGoals: G[] }) {
  const [items, dispatch] = useOptimistic(initialGoals, reducer);
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<G | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const openEdit = (g: G) => {
    setEditing(g);
    setEditOpen(true);
  };

  // Dropped goals never render (they're filtered server-side too).
  const visible = items.filter((g) => g.status !== "dropped");

  function onAdd(fields: {
    title: string;
    category: string;
    target_date: string;
    progress: number;
  }) {
    const temp: G = {
      id: "temp-" + Date.now(),
      title: fields.title,
      category: fields.category || null,
      target_date: fields.target_date || null,
      description: null,
      progress: fields.progress,
      status: fields.progress >= 100 ? "done" : "active",
    };
    setAdding(false);
    startTransition(async () => {
      dispatch({ kind: "add", goal: temp });
      const fd = new FormData();
      fd.set("title", fields.title);
      fd.set("category", fields.category);
      fd.set("target_date", fields.target_date);
      fd.set("progress", String(fields.progress));
      await addSummerGoal(fd);
    });
  }

  function onSave(
    g: G,
    fields: {
      title: string;
      category: string;
      target_date: string;
      progress: number;
      status: G["status"];
      notes: string;
    },
  ) {
    startTransition(async () => {
      dispatch({
        kind: "update",
        id: g.id,
        patch: {
          title: fields.title,
          category: fields.category || null,
          target_date: fields.target_date || null,
          description: fields.notes || null,
          progress: fields.progress,
          status: fields.status,
        },
      });
      const fd = new FormData();
      fd.set("id", g.id);
      fd.set("title", fields.title);
      fd.set("category", fields.category);
      fd.set("target_date", fields.target_date);
      fd.set("progress", String(fields.progress));
      fd.set("status", fields.status);
      fd.set("notes", fields.notes);
      await updateSummerGoal(fd);
    });
  }

  function onDelete(g: G) {
    startTransition(async () => {
      dispatch({ kind: "remove", id: g.id });
      const fd = new FormData();
      fd.set("id", g.id);
      await deleteSummerGoal(fd);
    });
  }

  return (
    <section className="rounded-2xl border border-[#1f1f1f] bg-[#141414] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted" />
          <h2 className="text-sm font-semibold text-text">Summer goals</h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-amber-500 transition-colors hover:text-amber-400"
        >
          {adding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {adding ? "Cancel" : "Add"}
        </button>
      </div>

      {adding ? <AddGoalForm onAdd={onAdd} /> : null}

      {visible.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted">
          No summer goals yet — set a longer-horizon goal.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((g) => (
            <GoalCard key={g.id} goal={g} onEdit={() => openEdit(g)} />
          ))}
        </div>
      )}

      <GoalEditPanel
        open={editOpen}
        goal={editing}
        onClose={() => setEditOpen(false)}
        onSave={onSave}
        onDelete={onDelete}
      />
    </section>
  );
}

function GoalCard({ goal, onEdit }: { goal: G; onEdit: () => void }) {
  const done = goal.status === "done";
  const pct = Math.min(100, Math.max(0, goal.progress));
  return (
    <div
      className={cn(
        "group rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] p-3",
        done && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {done ? (
              <Check className="size-3.5 shrink-0 text-green-400" />
            ) : null}
            <p
              className={cn(
                "truncate text-sm font-medium",
                done ? "text-muted line-through" : "text-text",
              )}
            >
              {goal.title}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {goal.category ? (
              <span className="rounded-full bg-[#1f1f1f] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {goal.category}
              </span>
            ) : null}
            {goal.target_date ? (
              <span className="text-[11px] text-muted">
                by {formatDateShort(goal.target_date)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          aria-label="Edit goal"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted opacity-0 transition-all hover:bg-[#1f1f1f] hover:text-text group-hover:opacity-100 [@media(hover:none)]:opacity-100 sm:size-8"
        >
          <Pencil className="size-4" />
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1f1f1f]">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              done ? "bg-green-400" : "bg-amber-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 text-right text-xs font-semibold tabular-nums text-muted">
          {pct}%
        </span>
      </div>
    </div>
  );
}

function AddGoalForm({
  onAdd,
}: {
  onAdd: (f: {
    title: string;
    category: string;
    target_date: string;
    progress: number;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState(0);

  const field =
    "h-10 w-full rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-text placeholder:text-muted/60 focus:border-amber-500 focus:outline-none";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const tt = title.trim();
        if (!tt) return;
        onAdd({
          title: tt,
          category: category.trim(),
          target_date: targetDate,
          progress,
        });
      }}
      className="mb-3 space-y-2 rounded-xl border border-[#1f1f1f] bg-[#0f0f0f] p-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal title…"
        autoFocus
        className={field}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className={field}
        />
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={field}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          Start %
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="h-10 w-20 rounded-lg border border-[#272727] bg-[#0f0f0f] px-2 text-sm tabular-nums text-text focus:border-amber-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
        >
          <Plus className="size-4" /> Add goal
        </button>
      </div>
    </form>
  );
}

type GoalFields = {
  title: string;
  category: string;
  target_date: string;
  progress: number;
  status: G["status"];
  notes: string;
};

function GoalEditPanel({
  open,
  goal,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  goal: G | null;
  onClose: () => void;
  onSave: (g: G, f: GoalFields) => void;
  onDelete: (g: G) => void;
}) {
  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Edit goal"
      footer={
        goal ? (
          <div className="space-y-2">
            <Button
              type="submit"
              form="goal-edit-form"
              className="w-full bg-amber-500 text-black hover:bg-amber-400"
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => {
                onDelete(goal);
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
      {goal ? (
        <GoalEditFields
          key={goal.id}
          goal={goal}
          onSubmit={(f) => {
            onSave(goal, f);
            onClose();
          }}
        />
      ) : null}
    </SlidePanel>
  );
}

/** Mounts fresh per open, so useState initialisers seed from the goal. */
function GoalEditFields({
  goal,
  onSubmit,
}: {
  goal: G;
  onSubmit: (f: GoalFields) => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [category, setCategory] = useState(goal.category ?? "");
  const [targetDate, setTargetDate] = useState(goal.target_date ?? "");
  const [progress, setProgress] = useState(goal.progress);
  const [status, setStatus] = useState<G["status"]>(goal.status);
  const [notes, setNotes] = useState(goal.description ?? "");

  const field =
    "h-11 w-full rounded-lg border border-[#272727] bg-[#0f0f0f] px-3 text-sm text-text focus:border-amber-500 focus:outline-none";

  return (
    <form
      id="goal-edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        const tt = title.trim();
        if (!tt) return;
        onSubmit({
          title: tt,
          category: category.trim(),
          target_date: targetDate,
          progress,
          status,
          notes: notes.trim(),
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Fitness, Career"
          className={cn(field, "placeholder:text-muted/60")}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Target date</label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={field}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-muted">Progress</label>
          <span className="text-xs font-semibold tabular-nums text-amber-500">{progress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div>
        <label className={cn(LABEL, "mb-1.5 block")}>Status</label>
        <div className="grid grid-cols-3 gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "h-10 rounded-lg border text-xs font-medium capitalize transition-colors",
                status === s
                  ? s === "done"
                    ? "border-green-400/50 bg-green-400/15 text-green-400"
                    : s === "dropped"
                      ? "border-red-400/50 bg-red-400/15 text-red-400"
                      : "border-amber-500/50 bg-amber-500/15 text-amber-500"
                  : "border-[#272727] bg-transparent text-muted/70 hover:text-muted",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
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
