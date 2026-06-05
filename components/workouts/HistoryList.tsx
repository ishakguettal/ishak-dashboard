"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Trash2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateShort } from "@/lib/utils/date";
import { titleize } from "@/lib/utils/format";
import { deleteSession } from "@/app/(app)/workouts/actions";

type Session = {
  id: string;
  session_date: string;
  workout_type: string | null;
  back_pain: number | null;
  energy: number | null;
  duration_min: number | null;
};

type SetRow = {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  set_number: number;
  reps: number | null;
  weight: number | null;
  is_warmup: boolean;
};

function painColor(p: number | null) {
  if (p == null) return "text-muted";
  if (p >= 7) return "text-red-400";
  if (p >= 4) return "text-amber-500";
  return "text-green-400";
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 84;
  const h = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HistoryList({
  sessions,
  sets,
}: {
  sessions: Session[];
  sets: SetRow[];
}) {
  const [open, setOpen] = useState<string | null>(null);

  // exercise_id -> chronological top weight per session (asc), + all-time PR.
  const { progression, prByExercise } = useMemo(() => {
    const bySessionEx = new Map<string, number>(); // `${sid}|${eid}` -> top weight
    const dateOf = new Map<string, string>(sessions.map((s) => [s.id, s.session_date]));
    const pr = new Map<string, number>();
    for (const st of sets) {
      if (st.is_warmup || !st.exercise_id) continue;
      const w = Number(st.weight ?? 0);
      const k = `${st.session_id}|${st.exercise_id}`;
      bySessionEx.set(k, Math.max(bySessionEx.get(k) ?? 0, w));
      pr.set(st.exercise_id, Math.max(pr.get(st.exercise_id) ?? 0, w));
    }
    const prog = new Map<string, number[]>();
    const rows = [...bySessionEx.entries()]
      .map(([k, w]) => {
        const [sid, eid] = k.split("|");
        return { eid, date: dateOf.get(sid) ?? "", w };
      })
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const r of rows) {
      const arr = prog.get(r.eid) ?? [];
      arr.push(r.w);
      prog.set(r.eid, arr);
    }
    return { progression: prog, prByExercise: pr };
  }, [sessions, sets]);

  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-6 text-center text-sm text-muted">
        No past sessions yet. Finished workouts show up here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const sSets = sets.filter((x) => x.session_id === s.id && !x.is_warmup);
        const isOpen = open === s.id;

        // group by exercise
        const order: string[] = [];
        const groups = new Map<string, SetRow[]>();
        for (const st of sSets) {
          const key = st.exercise_id ?? st.exercise_name ?? st.id;
          if (!groups.has(key)) {
            groups.set(key, []);
            order.push(key);
          }
          groups.get(key)!.push(st);
        }

        return (
          <div
            key={s.id}
            className="overflow-hidden rounded-xl border border-[#1e1e1e] bg-[#141414]"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted transition-transform",
                  isOpen && "rotate-180",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {formatDateShort(s.session_date)}
                  </span>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-500">
                    {titleize(s.workout_type ?? "—")}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {sSets.length} sets
                  {s.duration_min ? ` · ${s.duration_min}m` : ""} ·{" "}
                  <span className={painColor(s.back_pain)}>
                    back {s.back_pain ?? "—"}/10
                  </span>
                </p>
              </div>
            </button>

            {isOpen ? (
              <div className="space-y-3 border-t border-[#1e1e1e] p-4">
                {order.map((key) => {
                  const rows = groups.get(key)!;
                  const name = rows[0].exercise_name ?? "Exercise";
                  const eid = rows[0].exercise_id ?? "";
                  const pr = prByExercise.get(eid) ?? 0;
                  const series = (progression.get(eid) ?? []).slice(-8);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{name}</p>
                        <Sparkline values={series} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {rows.map((st) => {
                          const isPR =
                            pr > 0 && Number(st.weight ?? 0) === pr;
                          return (
                            <span
                              key={st.id}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs tabular-nums",
                                isPR
                                  ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                                  : "border-[#2a2a2a] bg-[#1a1a1a] text-muted",
                              )}
                            >
                              {st.weight ?? "—"}×{st.reps ?? "—"}
                              {isPR ? <Trophy className="size-3" /> : null}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {s.energy != null ? (
                  <p className="text-xs text-muted">Energy {s.energy}/10</p>
                ) : null}
                <form action={deleteSession}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" /> Delete session
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
