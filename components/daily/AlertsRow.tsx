"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Briefcase, Wallet, Smile, Zap, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatAED } from "@/lib/utils/format";
import { saveMoodEnergy } from "@/app/(app)/reflection/actions";

export function AlertsRow({
  careerFollowups,
  careerDeadlines,
  subsCount,
  subsTotalAED,
  moodLogged,
  mood,
  energy,
}: {
  careerFollowups: number;
  careerDeadlines: number;
  subsCount: number;
  subsTotalAED: number;
  moodLogged: boolean;
  mood: number | null;
  energy: number | null;
}) {
  const [, startTransition] = useTransition();
  const [m, setM] = useState(mood ?? 5);
  const [e, setE] = useState(energy ?? 5);

  function logMood() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mood", String(m));
      fd.set("energy", String(e));
      await saveMoodEnergy(fd);
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Career */}
      <Link href="/career">
        <Card className="group flex h-full items-center gap-3 transition-colors hover:border-amber-500/40">
          <Briefcase className="size-5 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Career</p>
            <p className="text-xs text-muted">
              {careerFollowups} follow-up{careerFollowups === 1 ? "" : "s"} today ·{" "}
              {careerDeadlines} deadline{careerDeadlines === 1 ? "" : "s"} this week
            </p>
          </div>
          <ChevronRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </Card>
      </Link>

      {/* Finance */}
      <Link href="/finance">
        <Card className="group flex h-full items-center gap-3 transition-colors hover:border-amber-500/40">
          <Wallet className="size-5 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Finance</p>
            <p className="text-xs text-muted">
              {subsCount > 0
                ? `${subsCount} renewing soon · ${formatAED(subsTotalAED)}`
                : "No renewals this week"}
            </p>
          </div>
          <ChevronRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </Card>
      </Link>

      {/* Mood / Energy */}
      <Card>
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Smile className="size-4 text-amber-500" /> Mood &amp; Energy
        </div>
        {moodLogged ? (
          <div className="flex items-center gap-4 pt-1">
            <div>
              <p className="text-2xl font-bold tabular-nums">{mood}</p>
              <p className="text-xs text-muted">mood</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{energy}</p>
              <p className="text-xs text-muted">energy</p>
            </div>
            <span className="ml-auto text-xs text-green-500">logged ✓</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Slider icon={Smile} label="Mood" value={m} onChange={setM} />
            <Slider icon={Zap} label="Energy" value={e} onChange={setE} />
            <button
              type="button"
              onClick={logMood}
              className="mt-1 w-full rounded-lg bg-amber-500 py-1.5 text-sm font-medium text-black hover:bg-amber-400"
            >
              Log
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Slider({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1">
          <Icon className="size-3.5" /> {label}
        </span>
        <span className="font-semibold tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(ev) => onChange(Number(ev.target.value))}
        className="w-full"
      />
    </div>
  );
}
