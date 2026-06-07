import { addDaysISO, todayISO } from "./date";

export interface DayTally {
  label: string;
  done: boolean;
  /** Goals that don't apply today (e.g. workout on a rest day) are skipped. */
  applicable?: boolean;
}

/** Percentage of applicable daily goals completed. */
export function dayCompletion(tallies: DayTally[]): number {
  const applicable = tallies.filter((t) => t.applicable !== false);
  if (applicable.length === 0) return 0;
  const done = applicable.filter((t) => t.done).length;
  return Math.round((done / applicable.length) * 100);
}

/**
 * Consecutive days (ending today) with 100% completion. Today only breaks the
 * streak once it's incomplete *and* counted — so a fresh, not-yet-finished day
 * keeps yesterday's streak alive.
 */
export function currentStreak(
  logs: { log_date: string; completion_pct: number | string }[],
  today: string = todayISO(),
): number {
  const map = new Map(
    logs.map((l) => [l.log_date, Number(l.completion_pct)]),
  );

  let cursor = today;
  if ((map.get(today) ?? 0) < 100) {
    cursor = addDaysISO(today, -1);
  }

  let streak = 0;
  while ((map.get(cursor) ?? 0) >= 100) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive 100%-completion days in the given history. */
export function longestStreak(
  logs: { log_date: string; completion_pct: number | string }[],
): number {
  const days = logs
    .filter((l) => Number(l.completion_pct) >= 100)
    .map((l) => l.log_date)
    .sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDaysISO(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

/** A calendar day counts toward the streak when its score reaches this. */
export const GOOD_DAY_SCORE = 70;

/**
 * Consecutive calendar days **ending yesterday** with score ≥ 70. Today is
 * deliberately excluded — the day isn't over, so it can't break or extend the
 * run yet.
 */
export function scoreStreak(
  scores: { date: string; score: number | string }[],
  today: string = todayISO(),
): number {
  const map = new Map(scores.map((s) => [s.date, Number(s.score)]));
  let cursor = addDaysISO(today, -1); // start counting at yesterday
  let streak = 0;
  while ((map.get(cursor) ?? 0) >= GOOD_DAY_SCORE) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive calendar days with score ≥ 70, ever. */
export function bestScoreStreak(
  scores: { date: string; score: number | string }[],
): number {
  const days = scores
    .filter((s) => Number(s.score) >= GOOD_DAY_SCORE)
    .map((s) => s.date)
    .sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDaysISO(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}
