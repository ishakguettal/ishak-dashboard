import { WATER } from "@/lib/constants";

export interface WaterInputs {
  weight_kg?: number | null;
  workout_hours_per_week?: number | null;
  caffeine_mg?: number | null;
  water_target_override_ml?: number | null;
}

/**
 * Daily water target (ml), derived from bodyweight, training load and caffeine.
 *   base      = weight_kg * 33
 *   training  = (hours_per_week / 7) * 500   (daily-averaged)
 *   caffeine  = (caffeine_mg / 100) * 120    (offset mild diuretic effect)
 * Clamped to [2000, 5000] and rounded to the nearest 50 ml.
 * A manual override always wins.
 */
export function computeWaterTarget(p: WaterInputs): number {
  if (p.water_target_override_ml && p.water_target_override_ml > 0) {
    return p.water_target_override_ml;
  }
  const weight = p.weight_kg ?? 70;
  const hours = p.workout_hours_per_week ?? 0;
  const caffeine = p.caffeine_mg ?? 0;

  const raw =
    weight * WATER.perKg +
    (hours / 7) * WATER.perWorkoutHour +
    (caffeine / 100) * WATER.perCaffeine100mg;

  const clamped = Math.min(WATER.max, Math.max(WATER.min, raw));
  return Math.round(clamped / 50) * 50;
}
