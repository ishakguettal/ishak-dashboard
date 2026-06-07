export interface DayScoreInputs {
  tasksCompleted: number;
  tasksTotal: number;
  /** Most recent sleep log (today's, else yesterday's). */
  sleepHours: number | null;
  sleepQuality: number | null;
  /** Whether any sleep has ever been logged (false → neutral half-score). */
  hasSleepLog: boolean;
  isRestDay: boolean;
  hasSchedule: boolean;
  workoutDone: boolean;
  /** Dubai local time is past 18:00 — the day's training window has closed. */
  afterSix: boolean;
  waterMl: number;
  waterTarget: number;
  suppsTaken: number;
  suppsTotal: number;
}

/** Sleep-hours sub-score (max 15) — a sweet spot around 8h, oversleep dinged. */
function sleepHoursScore(hours: number | null): number {
  if (hours == null || hours < 5) return 0;
  if (hours < 6) return 5;
  if (hours < 7) return 9;
  if (hours < 8) return 13;
  if (hours < 9) return 15;
  return 13; // 9h+
}

/** Per-component score contributions (max: tasks 30, sleep 25, workout 20, water 15, supps 10). */
export interface ScoreBreakdown {
  tasks: number;
  sleep: number;
  workout: number;
  water: number;
  supplements: number;
}

/** Maximum points each component can contribute. */
export const SCORE_MAX: ScoreBreakdown = {
  tasks: 30,
  sleep: 25,
  workout: 20,
  water: 15,
  supplements: 10,
};

/**
 * The weighted contributions that make up the day score. Components are
 * forgiving where there's nothing to do (no tasks or no supplements configured
 * = full marks; no sleep ever logged = neutral half).
 */
export function computeScoreBreakdown(i: DayScoreInputs): ScoreBreakdown {
  // Tasks — 30
  const tasks = i.tasksTotal === 0 ? 30 : (i.tasksCompleted / i.tasksTotal) * 30;

  // Sleep — 25 (15 hours + 10 quality); neutral 12.5 when nothing logged
  const sleep = !i.hasSleepLog
    ? 12.5
    : sleepHoursScore(i.sleepHours) + ((i.sleepQuality ?? 0) / 10) * 10;

  // Workout — 20
  let workout: number;
  if (!i.hasSchedule) workout = 10; // no schedule set up → neutral
  else if (i.isRestDay) workout = 20; // rest days count as full
  else if (i.workoutDone) workout = 20;
  else workout = i.afterSix ? 0 : 10; // pending: half-credit until 6pm

  // Water — 15
  const water =
    i.waterTarget > 0 ? Math.min(15, (i.waterMl / i.waterTarget) * 15) : 15;

  // Supplements — 10
  const supplements = i.suppsTotal === 0 ? 10 : (i.suppsTaken / i.suppsTotal) * 10;

  return { tasks, sleep, workout, water, supplements };
}

/**
 * Real, data-driven day score (0–100): the sum of the weighted component
 * contributions (see {@link computeScoreBreakdown}).
 */
export function computeDayScore(i: DayScoreInputs): number {
  const b = computeScoreBreakdown(i);
  const total = b.tasks + b.sleep + b.workout + b.water + b.supplements;
  return Math.round(Math.max(0, Math.min(100, total)));
}

/** Qualitative label for the score column. */
export function dayScoreLabel(score: number, isRestDay: boolean): string {
  if (score >= 85) return isRestDay ? "Strong recovery day" : "Strong day";
  if (score >= 70) return "Good day";
  if (score >= 50) return "Steady day";
  if (score >= 30) return "Slow day";
  return "Rough day";
}

export interface DayStatusInputs {
  tasksCompleted: number;
  tasksTotal: number;
  waterMl: number;
  waterTarget: number;
  isRestDay: boolean;
  hasSchedule: boolean;
  workoutDone: boolean;
  /** Plain workout type for today, e.g. "legs". */
  workoutType: string;
  sleepHours: number | null;
  hasSleepLog: boolean;
  suppsTaken: number;
  suppsTotal: number;
}

/**
 * Short, neutral, comma-separated facts (max 3) about the day so far — built
 * from the same data as the score. No motivational filler.
 * e.g. "3 of 5 tasks done, water behind, workout pending".
 */
export function dayStatusLine(i: DayStatusInputs): string {
  const facts: string[] = [];

  // Tasks
  if (i.tasksTotal === 0) facts.push("no tasks today");
  else if (i.tasksCompleted >= i.tasksTotal) facts.push("all tasks done");
  else facts.push(`${i.tasksCompleted} of ${i.tasksTotal} tasks done`);

  // Water
  const wpct = i.waterTarget > 0 ? (i.waterMl / i.waterTarget) * 100 : 100;
  facts.push(wpct >= 70 ? "water on track" : "water behind");

  // Workout (skipped entirely if no schedule)
  if (i.hasSchedule) {
    if (i.isRestDay) facts.push("rest day");
    else if (i.workoutDone) facts.push(`${i.workoutType.toLowerCase()} day done`);
    else facts.push("workout pending");
  }

  // Sleep
  if (i.hasSleepLog && i.sleepHours != null) {
    facts.push(`slept ${i.sleepHours}h`);
  }

  // Supplements
  if (i.suppsTotal > 0) {
    facts.push(
      i.suppsTaken >= i.suppsTotal ? "supplements done" : "supplements pending",
    );
  }

  return facts.slice(0, 3).join(", ");
}
