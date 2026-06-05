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
