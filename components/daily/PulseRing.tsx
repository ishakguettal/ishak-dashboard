"use client";

import { useEffect, useState } from "react";
import { Flame, Pencil, Check } from "lucide-react";
import { updateDayWindow } from "@/app/(app)/actions";

const TZ = "Asia/Dubai";

function toMin(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function dubaiNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  let h = get("hour");
  if (h === 24) h = 0;
  return h * 60 + get("minute") + get("second") / 60;
}

function dubaiClock(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function todLabel(nowMin: number, startMin: number, endMin: number): string {
  if (nowMin < startMin) return "Before your day";
  if (nowMin >= endMin) return "Day complete";
  const f = (nowMin - startMin) / (endMin - startMin);
  if (f < 0.33) return "Good morning";
  if (f < 0.6) return "Midday — keep moving";
  if (f < 0.85) return "Afternoon push";
  return "Evening wind-down";
}

export function PulseRing({
  dayStart,
  dayEnd,
  completion,
  streak,
  projected,
  projectedLabel,
}: {
  dayStart: string;
  dayEnd: string;
  completion: number;
  streak: number;
  projected: number;
  projectedLabel: string;
}) {
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [clock, setClock] = useState("--:--");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const tick = () => {
      setNowMin(dubaiNowMinutes());
      setClock(dubaiClock());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const startMin = toMin(dayStart);
  const endMin = Math.max(startMin + 1, toMin(dayEnd));
  const timePct =
    nowMin == null
      ? 0
      : Math.min(100, Math.max(0, ((nowMin - startMin) / (endMin - startMin)) * 100));

  // The ring combines elapsed time and day completion.
  const ring = Math.round(0.5 * timePct + 0.5 * completion);
  const done = completion >= 100;
  const accent = done ? "#22c55e" : "#f59e0b";
  const isEndOfDay = nowMin != null && nowMin >= endMin;

  // SVG ring geometry
  const size = 220;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (ring / 100) * c;

  const label =
    nowMin == null ? "" : todLabel(nowMin, startMin, endMin);
  const delta = completion - projected;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--color-surface-2)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={accent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: accent }}
            >
              {label}
            </span>
            <span className="mt-1 text-5xl font-bold tabular-nums leading-none">
              {ring}
              <span className="text-2xl">%</span>
            </span>
            <span className="mt-1 font-mono text-sm text-muted">{clock}</span>
          </div>
        </div>

        {/* Streak + predictor */}
        <div className="w-full flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Flame className="size-3.5 text-amber-500" /> Streak
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {streak}
                <span className="ml-1 text-base font-medium text-muted">
                  day{streak === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text"
              title="Edit day window"
            >
              {dayStart.slice(0, 5)}–{dayEnd.slice(0, 5)}
              <Pencil className="size-3" />
            </button>
          </div>

          {editing ? (
            <form
              action={async (fd) => {
                await updateDayWindow(fd);
                setEditing(false);
              }}
              className="flex items-end gap-2 rounded-lg border border-border bg-surface-2/50 p-2"
            >
              <label className="text-xs text-muted">
                Start
                <input
                  type="time"
                  name="day_start_time"
                  defaultValue={dayStart.slice(0, 5)}
                  className="mt-0.5 block rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-muted">
                End
                <input
                  type="time"
                  name="day_end_time"
                  defaultValue={dayEnd.slice(0, 5)}
                  className="mt-0.5 block rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
                />
              </label>
              <button
                type="submit"
                className="flex h-8 items-center gap-1 rounded-md bg-amber-500 px-2.5 text-sm font-medium text-black"
              >
                <Check className="size-4" />
              </button>
            </form>
          ) : null}

          {/* Day Score Predictor */}
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                {isEndOfDay ? "Final score" : "Day score"}
              </span>
              {!isEndOfDay ? (
                <span className="text-xs text-muted">now {completion}%</span>
              ) : (
                <span
                  className={
                    "text-xs font-medium " +
                    (delta >= 0 ? "text-green-500" : "text-amber-500")
                  }
                >
                  {delta >= 0 ? "+" : ""}
                  {delta}% vs projection
                </span>
              )}
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {isEndOfDay ? completion : projected}%
              <span className="ml-2 align-middle text-sm font-medium text-amber-500">
                {isEndOfDay ? "" : projectedLabel}
              </span>
            </p>
            {/* projection vs live bar */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${isEndOfDay ? completion : projected}%` }}
              />
            </div>
            {!isEndOfDay ? (
              <p className="mt-1 text-[11px] text-muted">
                Morning projection · updates as you complete the day
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
