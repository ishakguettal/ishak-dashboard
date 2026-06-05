"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Droplets, Pill, Moon, Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import { addWater, toggleSupplement, addSleep } from "@/app/(app)/health/actions";

const TZ = "Asia/Dubai";

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

export function HealthRow({
  today,
  waterTotal,
  waterTarget,
  supplements,
  sleep,
}: {
  today: string;
  waterTotal: number;
  waterTarget: number;
  supplements: Supp[];
  sleep: { hours: number | null; quality: number | null } | null;
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
  const [custom, setCustom] = useState("");
  const waterPct = waterTarget ? Math.min(100, (water / waterTarget) * 100) : 0;

  function logWater(amount: number) {
    if (!amount || amount <= 0) return;
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

  // ---- Sleep quick log ----
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

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <style>{`
        @keyframes dailyFlash {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50% { box-shadow: 0 0 0 3px rgba(239,68,68,0.5); }
        }
        .daily-flash {
          animation: dailyFlash 1.2s ease-in-out infinite;
          border-color: rgb(239 68 68) !important;
          color: rgb(248 113 113);
        }
      `}</style>

      {/* Water */}
      <Card>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Droplets className="size-4 text-amber-500" /> Water
        </div>
        <p className="mb-2 text-2xl font-bold tabular-nums">
          {(water / 1000).toFixed(1)}
          <span className="text-base font-medium text-muted">
            L of {(waterTarget / 1000).toFixed(1)}L
          </span>
        </p>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              water >= waterTarget ? "bg-green-500" : "bg-amber-500",
            )}
            style={{ width: `${waterPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => logWater(250)}
            className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm hover:border-amber-500"
          >
            +250ml
          </button>
          <button
            type="button"
            onClick={() => logWater(500)}
            className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm hover:border-amber-500"
          >
            +500ml
          </button>
          <div className="flex gap-1">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              type="number"
              placeholder="ml"
              className="w-16 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                logWater(Number(custom));
                setCustom("");
              }}
              className="rounded-lg bg-amber-500 px-2 text-black hover:bg-amber-400"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Supplements */}
      <Card>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Pill className="size-4 text-amber-500" /> Supplements
        </div>
        {supps.length === 0 ? (
          <p className="text-sm text-muted">None active.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
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
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    s.taken
                      ? "border-green-500/40 bg-green-500/15 text-green-500"
                      : overdue
                        ? "daily-flash border-border bg-surface-2"
                        : "border-border bg-surface-2 text-text hover:border-amber-500",
                  )}
                  title={
                    s.reminder_time ? `Due ${s.reminder_time.slice(0, 5)}` : undefined
                  }
                >
                  {s.taken ? <Check className="size-3.5" /> : null}
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
        {supps.some((s) => {
          const due = toMin(s.reminder_time);
          return !s.taken && due != null && now != null && now > due;
        }) ? (
          <p className="mt-2 text-xs text-red-400">Some supplements are overdue.</p>
        ) : null}
      </Card>

      {/* Sleep */}
      <Card>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Moon className="size-4 text-amber-500" /> Sleep
        </div>
        {hasSleep ? (
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {sleep!.hours}
              <span className="text-base font-medium text-muted">h</span>
            </p>
            <p className="text-sm text-muted">
              {sleep!.quality != null
                ? `Quality ${sleep!.quality}/10`
                : "No quality logged"}
            </p>
          </div>
        ) : (
          <form onSubmit={logSleep} className="space-y-2">
            <p className="text-xs text-muted">Log last night</p>
            <div className="flex items-center gap-2">
              <input
                name="hours"
                type="number"
                step="0.1"
                placeholder="hrs"
                required
                className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-amber-400"
              >
                Log
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Quality</span>
                <span className="font-semibold tabular-nums">{quality}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
