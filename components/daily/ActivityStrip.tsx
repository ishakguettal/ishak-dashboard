import { addDaysISO, weekStartISO } from "@/lib/utils/date";

const WEEKS = 16;
const CELL = 10; // px
const GAP = 3; // px
const DAY_COL = 12; // px — width of the left day-label column

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]; // Mon → Sun
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const PALETTE = ["#161616", "#1e2a0f", "#2d4a18", "#4a7a28", "#6aaa38", "#F59E0B"];

/** Heatmap color for a day's completion percentage. */
function cellColor(pct: number | null): string {
  if (pct == null || pct <= 0) return "#161616";
  if (pct < 40) return "#1e2a0f";
  if (pct < 60) return "#2d4a18";
  if (pct < 80) return "#4a7a28";
  if (pct < 100) return "#6aaa38";
  return "#F59E0B";
}

function monthOf(iso: string): number {
  return Number(iso.slice(5, 7)) - 1;
}

export function ActivityStrip({
  logs,
  today,
  completedDays,
  completionRate,
}: {
  logs: { log_date: string; completion_pct: number }[];
  today: string;
  completedDays: number;
  completionRate: number;
}) {
  const map = new Map(logs.map((l) => [l.log_date, Number(l.completion_pct)]));

  // Grid runs from the Monday 15 weeks ago through the current week (Mon–Sun).
  const thisMonday = weekStartISO(today);
  const start = addDaysISO(thisMonday, -(WEEKS - 1) * 7);
  const weekMondays = Array.from({ length: WEEKS }, (_, c) =>
    addDaysISO(start, c * 7),
  );

  // Month labels: show the month name on the first column it appears in.
  const monthLabels = weekMondays.map((mon, i) => {
    const m = monthOf(mon);
    const prev = i > 0 ? monthOf(weekMondays[i - 1]) : -1;
    return m !== prev ? MONTHS[m] : "";
  });

  return (
    <section
      style={{
        backgroundColor: "#0f0f0f",
        borderTop: "0.5px solid #1a1a1a",
        borderBottom: "0.5px solid #1a1a1a",
        padding: "14px 24px",
      }}
    >
      <div className="flex items-start gap-6">
        {/* LEFT — Stats */}
        <div className="flex shrink-0 gap-6">
          <Stat value={String(completedDays)} label="Days completed" />
          <Stat value={`${completionRate}%`} label="Completion rate" green />
        </div>

        {/* CENTER — Heatmap */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="inline-block">
            {/* Month labels */}
            <div
              className="flex"
              style={{ paddingLeft: DAY_COL + GAP, gap: GAP, marginBottom: 4 }}
            >
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-[9px] text-[#444]"
                  style={{ width: CELL, minWidth: CELL }}
                >
                  <span className="whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>

            {/* Rows: Mon (top) → Sun (bottom) */}
            <div className="flex flex-col" style={{ gap: GAP }}>
              {DAY_LABELS.map((dl, r) => (
                <div key={r} className="flex items-center" style={{ gap: GAP }}>
                  <div
                    className="text-[9px] leading-none text-[#2a2a2a]"
                    style={{ width: DAY_COL }}
                  >
                    {dl}
                  </div>
                  {weekMondays.map((_, c) => {
                    const date = addDaysISO(start, c * 7 + r);
                    const future = date > today;
                    const pct = future ? null : (map.get(date) ?? null);
                    return (
                      <div
                        key={c}
                        title={
                          future
                            ? date
                            : `${date}: ${pct == null ? "no entry" : pct + "%"}`
                        }
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 2,
                          backgroundColor: cellColor(pct),
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Legend */}
        <div className="flex shrink-0 items-center gap-1 self-end">
          <span className="text-[9px] text-[#2a2a2a]">0%</span>
          {PALETTE.map((c) => (
            <span
              key={c}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 2,
                backgroundColor: c,
              }}
            />
          ))}
          <span className="text-[9px] text-[#2a2a2a]">100%</span>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  green,
}: {
  value: string;
  label: string;
  green?: boolean;
}) {
  return (
    <div>
      <p
        className="text-[18px] font-medium leading-none tabular-nums"
        style={green ? { color: "#4ade80" } : undefined}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10px] uppercase tracking-wide text-[#444]">
        {label}
      </p>
    </div>
  );
}
