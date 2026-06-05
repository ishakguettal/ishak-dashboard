"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { titleize } from "@/lib/utils/format";
import { addWater, toggleSupplement, addSleep } from "@/app/(app)/health/actions";
import { logBackPain } from "@/app/(app)/actions";

const TZ = "Asia/Dubai";
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

function dubaiNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  let h = get("hour");
  if (h === 24) h = 0;
  return h * 60 + get("minute");
}

function toMin(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

type Supp = {
  id: string;
  name: string;
  reminder_time: string | null;
  taken: boolean;
  timing: string | null;
};

const BACK_BUCKETS = [
  { value: 2, label: "1–3 Fine", lo: 1, hi: 3, tone: "green" as const },
  { value: 5, label: "4–6 Moderate", lo: 4, hi: 6, tone: "amber" as const },
  { value: 8, label: "7–10 Bad", lo: 7, hi: 10, tone: "red" as const },
];

const TONE: Record<"green" | "amber" | "red", string> = {
  green: "border-green-400/40 bg-green-400/15 text-green-400",
  amber: "border-amber-500/40 bg-amber-500/15 text-amber-500",
  red: "border-red-400/40 bg-red-400/15 text-red-400",
};

export function HealthStrip({
  today,
  waterTotal,
  waterTarget,
  supplements,
  sleep,
  backToday,
  lastBackPain,
}: {
  today: string;
  waterTotal: number;
  waterTarget: number;
  supplements: Supp[];
  sleep: { hours: number | null; quality: number | null } | null;
  backToday: number | null;
  lastBackPain: number | null;
}) {
  const [, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(dubaiNowMinutes());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // ---- Water ----
  const [water, addWaterOpt] = useOptimistic(waterTotal, (s, d: number) => s + d);
  const waterPct = waterTarget ? Math.min(100, (water / waterTarget) * 100) : 0;

  function logWater(amount: number) {
    startTransition(async () => {
      addWaterOpt(amount);
      const fd = new FormData();
      fd.set("amount_ml", String(amount));
      await addWater(fd);
    });
  }

  // ---- Supplements ----
  const [supps, toggleSuppOpt] = useOptimistic(supplements, (state, id: string) =>
    state.map((s) => (s.id === id ? { ...s, taken: !s.taken } : s)),
  );

  function toggleSupp(s: Supp) {
    startTransition(async () => {
      toggleSuppOpt(s.id);
      const fd = new FormData();
      fd.set("supplement_id", s.id);
      fd.set("taken", String(s.taken));
      await toggleSupplement(fd);
    });
  }

  // ---- Sleep ----
  const [quality, setQuality] = useState(7);
  const hasSleep = sleep && sleep.hours != null;

  function logSleep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const hours = (form.elements.namedItem("hours") as HTMLInputElement)?.value;
    if (!hours) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("log_date", today);
      fd.set("hours", hours);
      fd.set("quality", String(quality));
      await addSleep(fd);
    });
  }

  // ---- Back check-in ----
  const [back, setBackOpt] = useOptimistic(backToday, (_s, v: number) => v);

  function logBack(value: number) {
    startTransition(async () => {
      setBackOpt(value);
      const fd = new FormData();
      fd.set("back_pain", String(value));
      await logBackPain(fd);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#1f1f1f] bg-[#141414]">
      <style>{`
        @keyframes dailyFlash {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
          50% { box-shadow: 0 0 0 3px rgba(248,113,113,0.45); }
        }
        .daily-flash {
          animation: dailyFlash 1.2s ease-in-out infinite;
          border-color: rgb(248 113 113) !important;
          color: rgb(248 113 113);
        }
      `}</style>

      <div className="flex flex-col divide-y divide-[#1f1f1f] lg:flex-row lg:divide-x lg:divide-y-0">
        {/* Water */}
        <div className="flex-1 p-5">
          <p className={LABEL}>Water</p>
          <p className="mt-2 text-lg font-bold tabular-nums">
            {(water / 1000).toFixed(1)}
            <span className="text-sm font-medium text-muted">
              L of {(waterTarget / 1000).toFixed(1)}L
            </span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1f1f1f]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                water >= waterTarget ? "bg-green-400" : "bg-amber-500",
              )}
              style={{ width: `${waterPct}%` }}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => logWater(250)}
              className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1.5 text-xs hover:border-amber-500"
            >
              +250ml
            </button>
            <button
              type="button"
              onClick={() => logWater(500)}
              className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1.5 text-xs hover:border-amber-500"
            >
              +500ml
            </button>
          </div>
        </div>

        {/* Supplements */}
        <div className="flex-1 p-5">
          <p className={LABEL}>Supplements</p>
          {supps.length === 0 ? (
            <p className="mt-2 text-sm text-muted">None active.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {supps.map((s) => {
                const due = toMin(s.reminder_time);
                const overdue =
                  !s.taken && due != null && now != null && now > due;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSupp(s)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      s.taken
                        ? "border-green-400/40 bg-green-400/15 text-green-400"
                        : overdue
                          ? "daily-flash border-[#2a2a2a] bg-[#1a1a1a]"
                          : "border-[#2a2a2a] bg-[#1a1a1a] text-muted hover:border-amber-500",
                    )}
                    title={
                      s.reminder_time ? `Due ${s.reminder_time.slice(0, 5)}` : undefined
                    }
                  >
                    {s.taken
                      ? `✓ ${s.name}`
                      : s.timing
                        ? `${s.name} — ${titleize(s.timing).toLowerCase()}`
                        : s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sleep */}
        <div className="flex-1 p-5">
          <p className={LABEL}>Sleep</p>
          {hasSleep ? (
            <div className="mt-2">
              <p className="text-lg font-bold tabular-nums">
                {sleep!.hours}
                <span className="text-sm font-medium text-muted">h</span>
              </p>
              <p className="text-sm text-muted">
                {sleep!.quality != null
                  ? `Quality ${sleep!.quality}/10`
                  : "No quality logged"}
              </p>
            </div>
          ) : (
            <form onSubmit={logSleep} className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  name="hours"
                  type="number"
                  step="0.1"
                  placeholder="hrs"
                  required
                  className="w-16 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400"
                >
                  Log sleep
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Quality</span>
                  <span className="font-semibold tabular-nums">{quality}/10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </form>
          )}
        </div>

        {/* Back check-in */}
        <div className="flex-1 p-5">
          <p className={LABEL}>Back check-in</p>
          {lastBackPain != null && lastBackPain >= 7 && back == null ? (
            <p className="mt-2 text-xs text-red-400">
              Rough last session ({lastBackPain}/10) — ease in.
            </p>
          ) : back != null ? (
            <p className="mt-2 text-sm text-muted">
              Logged today:{" "}
              <span className="font-semibold text-text tabular-nums">{back}/10</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">How&apos;s the disc today?</p>
          )}
          <div className="mt-2 flex flex-col gap-1.5">
            {BACK_BUCKETS.map((b) => {
              const active = back != null && back >= b.lo && back <= b.hi;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => logBack(b.value)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                    active
                      ? TONE[b.tone]
                      : "border-[#2a2a2a] bg-[#1a1a1a] text-muted hover:border-[#3a3a3a]",
                  )}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
