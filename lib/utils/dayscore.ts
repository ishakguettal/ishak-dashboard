export interface DayScoreInputs {
  tasksTotal: number;
  sleepQuality: number | null; // 1-10, last night
  isRestDay: boolean;
  sessionExists: boolean;
  activeSupplements: number;
}

/**
 * Morning projection of how the day will go, from leading indicators known
 * early: last night's sleep, whether today is a workout day (and if a session
 * already exists), how many tasks are planned, and an active supplement routine.
 * Weighted blend → 0-100.
 */
export function projectDayScore(i: DayScoreInputs): number {
  const sleep = i.sleepQuality != null ? i.sleepQuality * 10 : 60; // neutral if unlogged
  const plan = i.tasksTotal === 0 ? 45 : Math.min(100, 55 + i.tasksTotal * 9);
  const workout = i.isRestDay ? 85 : i.sessionExists ? 100 : 75;
  const supps = i.activeSupplements === 0 ? 65 : 90;
  const score = sleep * 0.3 + plan * 0.2 + workout * 0.3 + supps * 0.2;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function dayScoreLabel(score: number, isRestDay: boolean): string {
  if (isRestDay) return "Rest day — recover";
  if (score >= 80) return "Strong day ahead";
  if (score >= 65) return "Solid potential";
  if (score >= 50) return "Steady day";
  return "Light day";
}
