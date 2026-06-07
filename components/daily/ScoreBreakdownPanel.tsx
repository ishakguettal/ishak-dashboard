import {
  CheckSquare,
  Moon,
  Dumbbell,
  Droplets,
  Pill,
  type LucideIcon,
} from "lucide-react";
import { SCORE_MAX, type ScoreBreakdown } from "@/lib/utils/dayscore";

const ROWS: { key: keyof ScoreBreakdown; label: string; icon: LucideIcon }[] = [
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "sleep", label: "Sleep", icon: Moon },
  { key: "workout", label: "Workout", icon: Dumbbell },
  { key: "water", label: "Water", icon: Droplets },
  { key: "supplements", label: "Supplements", icon: Pill },
];

/** Bar colour by how full the component is. */
function barColor(pct: number): string {
  if (pct >= 80) return "#4ade80"; // green
  if (pct >= 50) return "#f59e0b"; // amber
  return "rgba(239,68,68,0.6)"; // red, muted
}

/** Compact 5-row view of what's contributing to the day score. */
export function ScoreBreakdownPanel({ data }: { data: ScoreBreakdown }) {
  return (
    <div className="space-y-2">
      {ROWS.map(({ key, label, icon: Icon }) => {
        const max = SCORE_MAX[key];
        const val = data[key];
        const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-2.5">
            <Icon className="size-3.5 shrink-0 text-muted" />
            <span className="w-[72px] shrink-0 text-xs text-muted">{label}</span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#1f1f1f]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor(pct) }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
              {((val / max) * 10).toFixed(1)}/10
            </span>
          </div>
        );
      })}
    </div>
  );
}
