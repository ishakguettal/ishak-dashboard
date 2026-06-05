"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatAED } from "@/lib/utils/format";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { saveMoodEnergy } from "@/app/(app)/reflection/actions";

const LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

export function LifeStrip({
  careerActive,
  careerFollowups,
  urgentApp,
  netWorth,
  urgentSub,
  moodLogged,
  mood,
  energy,
}: {
  careerActive: number;
  careerFollowups: number;
  urgentApp: { company: string; status: string } | null;
  netWorth: number;
  urgentSub: { name: string; days: number } | null;
  moodLogged: boolean;
  mood: number | null;
  energy: number | null;
}) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [m, setM] = useState(mood ?? 5);
  const [e, setE] = useState(energy ?? 5);

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mood", String(m));
      fd.set("energy", String(e));
      await saveMoodEnergy(fd);
      setEditing(false);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#141414]">
      <div className="flex flex-col divide-y divide-[#1f1f1f] sm:flex-row sm:divide-x sm:divide-y-0">
        {/* Career */}
        <Link
          href="/career"
          className="group flex-1 p-5 transition-colors hover:bg-[#181818]"
        >
          <div className="flex items-center justify-between">
            <p className={LABEL}>Career</p>
            <ChevronRight className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums">
            {careerActive}
            <span className="ml-1 text-sm font-medium text-muted">active</span>
          </p>
          <p className="text-xs text-muted">
            {careerFollowups} follow-up{careerFollowups === 1 ? "" : "s"} due today
          </p>
          {urgentApp ? (
            <span className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-blue-400/40 bg-blue-400/15 px-2.5 py-1 text-xs text-blue-400">
              <span className="truncate">{urgentApp.company}</span>
              <span className="opacity-70">· {titleize(urgentApp.status)}</span>
            </span>
          ) : null}
        </Link>

        {/* Finance */}
        <Link
          href="/finance"
          className="group flex-1 p-5 transition-colors hover:bg-[#181818]"
        >
          <div className="flex items-center justify-between">
            <p className={LABEL}>Finance</p>
            <ChevronRight className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums">{formatAED(netWorth)}</p>
          <p className="text-xs text-muted">Net worth</p>
          {urgentSub ? (
            <span className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-red-400/40 bg-red-400/15 px-2.5 py-1 text-xs text-red-400">
              <span className="truncate">{urgentSub.name}</span>
              <span className="opacity-80">
                ·{" "}
                {urgentSub.days <= 0
                  ? "today"
                  : `${urgentSub.days}d`}
              </span>
            </span>
          ) : null}
        </Link>

        {/* Mood & Energy */}
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between">
            <p className={LABEL}>Mood &amp; Energy</p>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-amber-500 hover:text-amber-400"
              >
                {moodLogged ? "Update →" : "Log now →"}
              </button>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-3 space-y-2.5">
              <SliderRow label="Mood" value={m} onChange={setM} accent="amber" />
              <SliderRow label="Energy" value={e} onChange={setE} accent="blue" />
              <button
                type="button"
                onClick={save}
                className="w-full rounded-lg bg-amber-500 py-1.5 text-xs font-medium text-black hover:bg-amber-400"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              <Bar
                label="Mood"
                value={moodLogged ? mood : null}
                accent="bg-amber-500"
              />
              <Bar
                label="Energy"
                value={moodLogged ? energy : null}
                accent="bg-blue-400"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Bar({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent: string;
}) {
  const pct = value != null ? (value / 10) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-text">
          {value != null ? `${value}/10` : "—"}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1f1f1f]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", accent)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: "amber" | "blue";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-text">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(ev) => onChange(Number(ev.target.value))}
        className={cn(
          "mt-1 w-full",
          accent === "amber" ? "accent-amber-500" : "accent-blue-400",
        )}
      />
    </div>
  );
}
