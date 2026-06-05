/** All "today/this week" math is anchored to Dubai local time (UTC+4). */
export const TZ = "Asia/Dubai";

const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function utcOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Current calendar date in Dubai as `YYYY-MM-DD`. */
export function todayISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Shift an ISO date by a number of days. */
export function addDaysISO(iso: string, days: number): string {
  const dt = new Date(utcOf(iso));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Weekday index for an ISO date — 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso: string): number {
  return new Date(utcOf(iso)).getUTCDay();
}

/** Monday that starts the week containing `iso`. */
export function weekStartISO(iso: string = todayISO()): string {
  const diff = (weekdayOf(iso) + 6) % 7; // days since Monday
  return addDaysISO(iso, -diff);
}

/** Whole days from `from` until `target` (negative = in the past). */
export function daysUntil(target: string, from: string = todayISO()): number {
  return Math.round((utcOf(target) - utcOf(from)) / 86_400_000);
}

/** "Monday, June 5, 2026" */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Jun 5" */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function weekdayName(index: number): string {
  return WEEKDAY_LONG[index] ?? "";
}

/** Friendly relative label for a due/renewal date. */
export function relativeDay(target: string, from: string = todayISO()): string {
  const d = daysUntil(target, from);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${Math.abs(d)}d overdue`;
  return `in ${d}d`;
}
