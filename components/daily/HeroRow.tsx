"use client";

import { useEffect, useState } from "react";
import { Pencil, Check } from "lucide-react";
import { SmartPanel, type SmartData } from "./SmartPanel";
import { ScoreBreakdownPanel } from "./ScoreBreakdownPanel";
import { type ScoreBreakdown } from "@/lib/utils/dayscore";
import { updateDayWindow } from "@/app/(app)/actions";

const TZ = "Asia/Dubai";

function toMin(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function dubaiNow(): { min: number; clock: string } {
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
  const min = h * 60 + get("minute") + get("second") / 60;
  const clock = `${String(h).padStart(2, "0")}:${String(get("minute")).padStart(2, "0")}`;
  return { min, clock };
}

const LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

export function HeroRow({
  dayStart,
  dayEnd,
  dayScore,
  scoreBreakdown,
  statusLine,
  streak,
  bestStreak,
  smart,
}: {
  dayStart: string;
  dayEnd: string;
  dayScore: number;
  /** Per-component contributions to the score, shown in column 2. */
  scoreBreakdown: ScoreBreakdown;
  /** Short, neutral facts about the day so far (shown inside the ring). */
  statusLine: string;
  streak: number;
  bestStreak: number;
  smart: SmartData;
}) {
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [clock, setClock] = useState("--:--");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const tick = () => {
      const { min, clock } = dubaiNow();
      setNowMin(min);
      setClock(clock);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const startMin = toMin(dayStart);
  const endMin = Math.max(startMin + 1, toMin(dayEnd));

  // Ring now reflects the real day score; green once it clears a "good day".
  const accent = dayScore >= 70 ? "#4ade80" : "#f59e0b";

  // Time remaining in the day.
  const remaining = nowMin == null ? 0 : Math.max(0, Math.round(endMin - nowMin));
  const remH = Math.floor(remaining / 60);
  const remM = remaining % 60;
  const remText =
    nowMin == null
      ? "—"
      : nowMin >= endMin
        ? "Day complete"
        : `${remH}h ${remM}m left in your day`;

  // SVG ring geometry
  const size = 152;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (dayScore / 100) * c;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#141414]">
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        title="Edit day window"
        className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted transition-colors hover:text-text"
      >
        {dayStart.slice(0, 5)}–{dayEnd.slice(0, 5)}
        <Pencil className="size-3" />
      </button>

      {editing ? (
        <form
          action={async (fd) => {
            await updateDayWindow(fd);
            setEditing(false);
          }}
          className="absolute right-3 top-11 z-20 flex items-end gap-2 rounded-lg border border-[#262626] bg-[#1a1a1a] p-2 shadow-lg"
        >
          <label className="text-[10px] uppercase tracking-wide text-muted">
            Start
            <input
              type="time"
              name="day_start_time"
              defaultValue={dayStart.slice(0, 5)}
              className="mt-0.5 block rounded-md border border-[#262626] bg-[#0f0f0f] px-2 py-1 text-sm"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wide text-muted">
            End
            <input
              type="time"
              name="day_end_time"
              defaultValue={dayEnd.slice(0, 5)}
              className="mt-0.5 block rounded-md border border-[#262626] bg-[#0f0f0f] px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            className="flex h-8 items-center rounded-md bg-amber-500 px-2.5 text-black"
          >
            <Check className="size-4" />
          </button>
        </form>
      ) : null}

      <div className="flex flex-col divide-y divide-[#1f1f1f] sm:flex-row sm:divide-x sm:divide-y-0">
        {/* Column 1 — Progress ring */}
        <div className="flex flex-col items-center justify-center gap-3 p-7 sm:min-w-[200px]">
          <p className="line-clamp-2 max-w-[200px] text-center text-xs text-zinc-400">
            {statusLine}
          </p>
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#1f1f1f"
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
                className="text-4xl font-bold leading-none tabular-nums"
                style={{ color: accent }}
              >
                {dayScore}
              </span>
              <span className="mt-1 font-mono text-xs text-muted">{clock}</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted">{remText}</p>
        </div>

        {/* Column 2 — Score breakdown */}
        <div className="flex flex-col justify-center gap-2.5 p-7 sm:min-w-[240px]">
          <span className={LABEL}>Score breakdown</span>
          <ScoreBreakdownPanel data={scoreBreakdown} />
        </div>

        {/* Column 3 — Streak */}
        <div className="flex flex-col justify-center gap-2 p-7 sm:min-w-[180px]">
          <span className={LABEL}>Streak</span>
          <p className="text-[26px] font-bold leading-none tabular-nums">
            <span>🔥</span> {streak}
            <span className="ml-1 align-middle text-sm font-medium text-muted">
              day{streak === 1 ? "" : "s"}
            </span>
          </p>
          <p className="text-xs text-muted">
            Best run: {bestStreak} day{bestStreak === 1 ? "" : "s"}
          </p>
        </div>

        {/* Column 4 — Smart panel (blends into the hero, no card border) */}
        <div className="flex min-w-0 flex-1 flex-col">
          <SmartPanel data={smart} />
        </div>
      </div>
    </div>
  );
}
