"use client";

import { useState } from "react";
import { Smile, Zap } from "lucide-react";
import { Textarea, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveMoodEnergy } from "@/app/(app)/reflection/actions";

function Slider({
  name,
  value,
  onChange,
  label,
  icon: Icon,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <Icon className="size-4" /> {label}
        </span>
        <span className="font-semibold tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        name={name}
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function MoodEnergyForm({
  mood,
  energy,
  notes,
}: {
  mood: number | null;
  energy: number | null;
  notes: string | null;
}) {
  const [m, setM] = useState(mood ?? 5);
  const [e, setE] = useState(energy ?? 5);

  return (
    <form action={saveMoodEnergy} className="space-y-4">
      <Slider name="mood" value={m} onChange={setM} label="Mood" icon={Smile} />
      <Slider name="energy" value={e} onChange={setE} label="Energy" icon={Zap} />
      <Field label="Note (optional)">
        <Textarea
          name="notes"
          rows={2}
          defaultValue={notes ?? ""}
          placeholder="How did today feel?"
        />
      </Field>
      <SubmitButton size="sm">Save today</SubmitButton>
    </form>
  );
}
