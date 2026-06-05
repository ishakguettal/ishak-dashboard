import { addDaysISO, weekStartISO } from "@/lib/utils/date";

const WEEKS = 16;
const CELL = 14; // px — cell height (width stretches to fill)
const GAP = 3; // px
const DAY_COL = 14; // px — width of the left day-label column

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]; // Mon → Sun
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const LEGEND = [
  { color: "#161616", label: "0%" },
  { color: "#1e2a0f", label: "1–39%" },
  { color: "#2d4a18", label: "40–59%" },
  { color: "#4a7a28", label: "60–79%" },
  { color: "#6aaa38", label: "80–99%" },
  { color: "#F59E0B", label: "100%" },
];

// Shared column template: fixed day-label column, then 16 stretchy week columns.
const GRID_COLS = `${DAY_COL}px repeat(${WEEKS}, minmax(0, 1fr))`;

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
}: {
  logs: { log_date: string; completion_pct: number }[];
  today: string;
  /** Accepted for compatibility with the page; no longer rendered. */
  completedDays?: number;
  completionRate?: number;
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
        padding: "10px 24px",
      }}
    >
      {/* Heatmap, stretched to fill the full width */}
      <div className="min-w-0">
        {/* Month labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID_COLS,
            gap: GAP,
            marginBottom: 4,
          }}
        >
          <div />
          {monthLabels.map((label, i) => (
            <div key={i} className="overflow-visible text-[9px] text-[#444]">
              <span className="whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>

        {/* Rows: Mon (top) → Sun (bottom) */}
        <div className="flex flex-col" style={{ gap: GAP }}>
          {DAY_LABELS.map((dl, r) => (
            <div
              key={r}
              style={{ display: "grid", gridTemplateColumns: GRID_COLS, gap: GAP }}
            >
              <div
                className="flex items-center text-[9px] text-[#2a2a2a]"
                style={{ height: CELL }}
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

      {/* Legend — bottom right, one labelled swatch per range */}
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        {LEGEND.map(({ color, label }) => (
          <div key={color} className="flex flex-col items-center gap-1">
            <span
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
            <span className="text-[10px]" style={{ color: "#555" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
