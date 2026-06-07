"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatAED } from "@/lib/utils/format";
import { ScoreBreakdownPanel } from "./ScoreBreakdownPanel";
import { type ScoreBreakdown } from "@/lib/utils/dayscore";

export type CoachData = {
  scoreBreakdown: ScoreBreakdown;
  sleepH: number;
  sleepQuality: number;
  waterMl: number;
  waterTarget: number;
  tasksComplete: number;
  tasksTotal: number;
  workoutStatus: "done" | "rest" | "pending" | "unknown";
  lastWorkoutDaysAgo: number | null;
};

export type SmartData = {
  tasks: { completed: number; total: number; overdue: string[] };
  water: { current_ml: number; target_ml: number };
  supplements: { overdue: string[]; upcoming: string[]; taken: string[] };
  sleep: { last_hours: number; last_quality: number; avg_7day: number };
  back_pain: { last_session: number; last_3_sessions: number[] };
  workout: {
    today_type: string;
    logged_today: boolean;
    days_since_last: number;
    is_rest_day: boolean;
  };
  career: { follow_ups_due: number; overdue_applications: number };
  finance: { renewals_this_week: number; renewal_amount: number };
  mood: { logged_today: boolean; last_mood: number; last_energy: number };
  body_weight: { last_kg: number; trend_7day: number };
  streak: { current: number; at_risk: boolean };
  time_of_day: "morning" | "midday" | "evening" | "night";
  coach: CoachData;
};

type Dot = "green" | "amber" | "red" | "gray";
const DOT: Record<Dot, string> = {
  green: "bg-green-400",
  amber: "bg-amber-500",
  red: "bg-red-400",
  gray: "bg-[#3a3a3a]",
};

const TABS = ["Now", "Focus", "Coach"] as const;
type Tab = (typeof TABS)[number];

function titleizeType(t: string) {
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function SmartPanel({ data }: { data: SmartData }) {
  const [tab, setTab] = useState<Tab>("Now");

  return (
    <div className="flex flex-1 flex-col">
      {/* Tabs */}
      <div className="flex gap-4 px-[18px] pt-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
              tab === t
                ? "border-amber-500 text-amber-500"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-[18px] py-[14px]">
        {tab === "Now" ? <NowTab d={data} /> : null}
        {tab === "Focus" ? <FocusTab d={data} /> : null}
        {tab === "Coach" ? <CoachTab d={data} /> : null}
      </div>
    </div>
  );
}

/* ─────────────────────────── NOW ─────────────────────────── */

function Row({ dot, children }: { dot: Dot; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className={cn("size-2 shrink-0 rounded-full", DOT[dot])} />
      <span className="min-w-0 flex-1 text-text">{children}</span>
    </li>
  );
}

function NowTab({ d }: { d: SmartData }) {
  const waterPct = d.water.target_ml
    ? (d.water.current_ml / d.water.target_ml) * 100
    : 0;

  const taskDot: Dot =
    d.tasks.total === 0
      ? "gray"
      : d.tasks.completed === d.tasks.total
        ? "green"
        : d.tasks.completed > 0
          ? "amber"
          : "red";

  const waterDot: Dot =
    waterPct > 70 ? "green" : waterPct >= 30 ? "amber" : "red";

  const sleepLogged = d.sleep.last_hours > 0;
  const sleepDot: Dot = !sleepLogged
    ? "gray"
    : d.sleep.last_hours > 7.5 && d.sleep.last_quality > 7
      ? "green"
      : d.sleep.last_hours < 6 || d.sleep.last_quality < 6
        ? "red"
        : "amber";

  const eveningish = d.time_of_day === "evening" || d.time_of_day === "night";
  const workoutDot: Dot = d.workout.is_rest_day || d.workout.logged_today
    ? "green"
    : eveningish
      ? "red"
      : "amber";

  const backLogged = d.back_pain.last_session > 0;
  const backDot: Dot = !backLogged
    ? "gray"
    : d.back_pain.last_session >= 7
      ? "red"
      : d.back_pain.last_session >= 4
        ? "amber"
        : "green";

  return (
    <ul className="space-y-2">
      <Row dot={taskDot}>
        {d.tasks.total === 0
          ? "No tasks today"
          : `${d.tasks.completed} of ${d.tasks.total} tasks done`}
      </Row>

      <Row dot={waterDot}>
        Water {(d.water.current_ml / 1000).toFixed(1)}L of{" "}
        {(d.water.target_ml / 1000).toFixed(1)}L
        <span className="text-muted"> · {Math.round(waterPct)}%</span>
      </Row>

      {d.supplements.overdue.map((name) => (
        <Row key={name} dot="red">
          {name} <span className="text-red-400">overdue</span>
        </Row>
      ))}

      <Row dot={sleepDot}>
        {sleepLogged
          ? `Slept ${d.sleep.last_hours}h · quality ${d.sleep.last_quality}/10`
          : "Sleep not logged"}
      </Row>

      <Row dot={workoutDot}>
        {d.workout.is_rest_day
          ? "Rest day — recover"
          : d.workout.logged_today
            ? `${titleizeType(d.workout.today_type)} logged`
            : eveningish
              ? `${titleizeType(d.workout.today_type)} not logged`
              : `${titleizeType(d.workout.today_type)} to do`}
      </Row>

      <Row dot={backLogged ? backDot : "gray"}>
        {backLogged
          ? `Back ${d.back_pain.last_session}/10 last session`
          : "Back not logged"}
      </Row>

      {d.career.overdue_applications > 0 ? (
        <Row dot="red">
          {d.career.overdue_applications} application
          {d.career.overdue_applications === 1 ? "" : "s"} overdue
        </Row>
      ) : d.career.follow_ups_due > 0 ? (
        <Row dot="amber">
          {d.career.follow_ups_due} career follow-up
          {d.career.follow_ups_due === 1 ? "" : "s"} due
        </Row>
      ) : null}

      {d.finance.renewals_this_week > 0 ? (
        <Row dot="amber">
          {d.finance.renewals_this_week} renewal
          {d.finance.renewals_this_week === 1 ? "" : "s"} ·{" "}
          {formatAED(d.finance.renewal_amount)}
        </Row>
      ) : null}

      <Row dot={d.mood.logged_today ? "green" : "gray"}>
        {d.mood.logged_today
          ? `Mood ${d.mood.last_mood} · Energy ${d.mood.last_energy}`
          : "Mood & energy not logged"}
      </Row>
    </ul>
  );
}

/* ─────────────────────────── FOCUS ─────────────────────────── */

type Action = { action: string; why: string };

function buildFocus(d: SmartData): Action[] {
  const out: Action[] = [];
  const waterPct = d.water.target_ml
    ? (d.water.current_ml / d.water.target_ml) * 100
    : 100;
  const remainingMl = Math.max(0, d.water.target_ml - d.water.current_ml);
  const training = !d.workout.is_rest_day;
  const midOrEve = d.time_of_day === "midday" || d.time_of_day === "evening";
  const eveningish = d.time_of_day === "evening" || d.time_of_day === "night";

  // 1. overdue supplements
  if (d.supplements.overdue.length > 0) {
    out.push({
      action: `Take ${joinNames(d.supplements.overdue)} — overdue`,
      why: "Stacking doses later throws off the rest of your routine.",
    });
  }
  // 2. water critically low by midday/evening
  if (midOrEve && waterPct < 25) {
    out.push({
      action: `Drink water now — only ${Math.round(waterPct)}% of target`,
      why: `You're behind for ${d.time_of_day}; about ${remainingMl}ml left to go.`,
    });
  }
  // 3. back pain warning on training day
  if (training && d.back_pain.last_session >= 7) {
    out.push({
      action: "Warm up the back carefully before lifting",
      why: `Last session you logged ${d.back_pain.last_session}/10 — no max loads today.`,
    });
  }
  // 4. workout not logged on training day (+ streak at risk)
  if (training && !d.workout.logged_today) {
    out.push({
      action: `Get today's ${titleizeType(d.workout.today_type)} session in`,
      why: d.streak.at_risk
        ? `Your ${d.streak.current}-day streak is at risk.`
        : `Planned ${titleizeType(d.workout.today_type)} day — don't skip it.`,
    });
  }
  // 5. career follow-ups overdue
  if (d.career.overdue_applications > 0 || d.career.follow_ups_due > 0) {
    const n = d.career.overdue_applications || d.career.follow_ups_due;
    out.push({
      action: `Follow up on ${n} application${n === 1 ? "" : "s"}`,
      why: "A nudge at the right time keeps you on the radar.",
    });
  }
  // 6. sleep not logged
  if (d.sleep.last_hours <= 0) {
    out.push({
      action: "Log last night's sleep",
      why: "Recovery data drives your overload and back-pain decisions.",
    });
  }
  // 7. mood not logged
  if (!d.mood.logged_today) {
    out.push({
      action: "Log mood & energy",
      why: "A 5-second check-in keeps your streak and trends honest.",
    });
  }
  // 8. finance renewals imminent
  if (d.finance.renewals_this_week > 0) {
    out.push({
      action: `Review ${d.finance.renewals_this_week} renewal${d.finance.renewals_this_week === 1 ? "" : "s"} — ${formatAED(d.finance.renewal_amount)}`,
      why: "Cancel anything you're not using before it bills.",
    });
  }
  // 9. tasks incomplete in evening/night
  if (eveningish && d.tasks.total > 0 && d.tasks.completed < d.tasks.total) {
    const left = d.tasks.total - d.tasks.completed;
    out.push({
      action: `Close out ${left} task${left === 1 ? "" : "s"}`,
      why: "Finish strong before the day ends.",
    });
  }
  return out;
}

const ENCOURAGE = [
  "You're on top of it — nothing urgent right now.",
  "Solid. Keep the momentum going.",
  "All clear here. Stay consistent.",
];

const CIRCLED = ["①", "②", "③"];

function FocusTab({ d }: { d: SmartData }) {
  const actions = buildFocus(d).slice(0, 3);

  return (
    <ol className="space-y-3">
      {[0, 1, 2].map((i) => {
        const a = actions[i];
        return (
          <li key={i} className="flex gap-2.5">
            <span
              className={cn(
                "shrink-0 text-base leading-tight",
                a ? "text-amber-500" : "text-[#3a3a3a]",
              )}
            >
              {CIRCLED[i]}
            </span>
            {a ? (
              <div className="min-w-0">
                <p className="text-sm text-text">{a.action}</p>
                <p className="text-xs text-muted">{a.why}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">{ENCOURAGE[i]}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─────────────────────────── COACH ─────────────────────────── */

const SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

type Obs = { text: string; sev: number };

/**
 * 3 plain-English observations from real data, worst component scores first.
 * `sev` is the underlying component's % of max (lower = more urgent).
 */
function buildGlance(c: SmartData["coach"], timeOfDay: SmartData["time_of_day"]): string[] {
  const b = c.scoreBreakdown;
  const out: Obs[] = [];

  const sleepPct = (b.sleep / 25) * 100;
  const waterPct = c.waterTarget > 0 ? (c.waterMl / c.waterTarget) * 100 : 100;
  const tasksPct = (b.tasks / 30) * 100;
  const workoutPct = (b.workout / 20) * 100;

  // Sleep (only when logged)
  if (c.sleepH > 0) {
    if (c.sleepH < 6.5)
      out.push({
        text: `You slept ${c.sleepH}h — below your threshold. Expect reduced focus today.`,
        sev: sleepPct,
      });
    else if (c.sleepH >= 7.5)
      out.push({ text: `Solid sleep last night (${c.sleepH}h). Good foundation.`, sev: sleepPct });
  }

  // Water — only flag after midday
  if (timeOfDay !== "morning" && waterPct < 40)
    out.push({
      text: `Water is behind — ${c.waterMl}ml of ${c.waterTarget}ml target.`,
      sev: waterPct,
    });

  // Tasks
  if (c.tasksTotal > 0 && c.tasksComplete >= c.tasksTotal)
    out.push({ text: `All ${c.tasksTotal} tasks done.`, sev: tasksPct });
  else if (c.tasksTotal > 0 && c.tasksComplete === 0)
    out.push({ text: "No tasks completed yet.", sev: 0 });

  // Workout
  if (c.workoutStatus === "rest")
    out.push({ text: "Rest day — recovery counts.", sev: workoutPct });
  else if (c.workoutStatus === "done")
    out.push({ text: "Workout logged.", sev: workoutPct });
  else if (c.workoutStatus === "pending")
    out.push({ text: "Workout still pending today.", sev: workoutPct });

  return out
    .sort((a, b) => a.sev - b.sev)
    .slice(0, 3)
    .map((o) => o.text);
}

function CoachTab({ d }: { d: SmartData }) {
  const glance = buildGlance(d.coach, d.time_of_day);
  return (
    <div className="space-y-4">
      <div>
        <p className={SECTION_LABEL}>What&apos;s driving your score</p>
        <div className="mt-2">
          <ScoreBreakdownPanel data={d.coach.scoreBreakdown} />
        </div>
      </div>

      <div>
        <p className={SECTION_LABEL}>Today at a glance</p>
        {glance.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {glance.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-text">
                <span className="text-amber-500">·</span>
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nothing notable yet.</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
