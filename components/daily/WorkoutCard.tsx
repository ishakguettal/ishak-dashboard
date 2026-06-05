import Link from "next/link";
import { Dumbbell, BedDouble, TriangleAlert, Check, Play } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WORKOUT_TYPE_STYLES } from "@/lib/constants";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function WorkoutCard({
  plannedType,
  isRestDay,
  sessionExists,
  consecutiveDays,
  lastBackPain,
}: {
  plannedType: string;
  isRestDay: boolean;
  sessionExists: boolean;
  consecutiveDays: number;
  lastBackPain: number | null;
}) {
  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Dumbbell className="size-4 text-amber-500" /> Workout
        </h2>
        <Badge className={cn(WORKOUT_TYPE_STYLES[plannedType] ?? WORKOUT_TYPE_STYLES.rest)}>
          {titleize(plannedType)}
        </Badge>
      </div>

      {isRestDay ? (
        <div className="flex flex-1 items-start gap-3 rounded-lg border border-border bg-surface-2/40 p-3">
          <BedDouble className="mt-0.5 size-5 text-muted" />
          <div>
            <p className="text-sm font-medium">Rest day</p>
            <p className="text-xs text-muted">
              {consecutiveDays > 0
                ? `${consecutiveDays} training day${consecutiveDays === 1 ? "" : "s"} in a row — let the disc recover.`
                : "Recovery is part of the plan."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          {lastBackPain != null && lastBackPain >= 7 ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-red-400">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs">
                Back was rough last session ({lastBackPain}/10) — warm up carefully
                today.
              </p>
            </div>
          ) : null}

          {sessionExists ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-green-500">
              <Check className="size-5" />
              <span className="text-sm font-semibold">Logged ✓</span>
            </div>
          ) : (
            <Link
              href="/workouts"
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              <Play className="size-4" /> Start session
            </Link>
          )}
          <p className="text-xs text-muted">
            {consecutiveDays > 0
              ? `${consecutiveDays} day${consecutiveDays === 1 ? "" : "s"} trained in a row`
              : "Fresh start"}
          </p>
        </div>
      )}
    </Card>
  );
}
