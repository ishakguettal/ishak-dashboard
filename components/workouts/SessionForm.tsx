"use client";

import { useState } from "react";
import { Input, Textarea, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateSession } from "@/app/(app)/workouts/actions";

export function SessionForm({
  session,
}: {
  session: {
    id: string;
    back_pain: number | null;
    duration_min: number | null;
    energy: number | null;
    notes: string | null;
  };
}) {
  const [pain, setPain] = useState(session.back_pain ?? 1);

  const painColor =
    pain >= 7 ? "text-danger" : pain >= 4 ? "text-warning" : "text-success";

  return (
    <form action={updateSession} className="space-y-4">
      <input type="hidden" name="id" value={session.id} />

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-muted">Back pain (L5-S1)</span>
          <span className={"font-semibold tabular-nums " + painColor}>
            {pain}/10
          </span>
        </div>
        <input
          type="range"
          name="back_pain"
          min={1}
          max={10}
          value={pain}
          onChange={(e) => setPain(Number(e.target.value))}
          className="w-full"
        />
        {pain >= 7 ? (
          <p className="mt-1 text-xs text-danger">
            High pain — stop heavy loading, prioritise mobility and rest.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (min)">
          <Input
            name="duration_min"
            type="number"
            min={0}
            defaultValue={session.duration_min ?? ""}
          />
        </Field>
        <Field label="Energy (1-10)">
          <Input
            name="energy"
            type="number"
            min={1}
            max={10}
            defaultValue={session.energy ?? ""}
          />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea name="notes" defaultValue={session.notes ?? ""} rows={2} />
      </Field>

      <SubmitButton size="sm">Save session</SubmitButton>
    </form>
  );
}
