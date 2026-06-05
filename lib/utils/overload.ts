export type OverloadAction = "increase" | "hold" | "build" | "deload";

export interface OverloadAdvice {
  action: OverloadAction;
  message: string;
  suggestedWeight?: number;
  tone: "success" | "info" | "warning";
}

export interface OverloadInput {
  /** Working sets from the most recent session for this exercise. */
  lastWorkingSets: { reps: number | null; weight: number | null }[];
  repMin: number;
  repMax: number;
  weightIncrement: number;
  /** Back-pain ratings (1-10) from up to the last 2 sessions, newest first. */
  recentBackPain: number[];
  isBackSensitive: boolean;
}

/**
 * Progressive-overload coach. Mindful of the L5-S1 disc: it never suggests a
 * load increase when recent back pain is high, and recommends a deload instead.
 */
export function suggestOverload(input: OverloadInput): OverloadAdvice {
  const { lastWorkingSets, repMin, repMax, weightIncrement } = input;
  const sets = lastWorkingSets.filter((s) => (s.reps ?? 0) > 0);

  if (sets.length === 0) {
    return {
      action: "hold",
      tone: "info",
      message: "Log a working set to start tracking progress.",
    };
  }

  const topWeight = Math.max(...sets.map((s) => Number(s.weight ?? 0)));
  const painFlag =
    input.recentBackPain.some((p) => p >= 7) || input.isBackSensitive;
  const recentHighPain = input.recentBackPain.some((p) => p >= 7);

  if (recentHighPain) {
    return {
      action: "deload",
      tone: "warning",
      suggestedWeight: round(topWeight * 0.9, weightIncrement),
      message: `Back pain was high recently — deload ~10% to about ${round(
        topWeight * 0.9,
        weightIncrement,
      )} kg and prioritise form.`,
    };
  }

  const allHitTop = sets.every((s) => (s.reps ?? 0) >= repMax);
  const allAtLeastMin = sets.every((s) => (s.reps ?? 0) >= repMin);

  if (allHitTop && !painFlag) {
    const next = topWeight + weightIncrement;
    return {
      action: "increase",
      tone: "success",
      suggestedWeight: next,
      message: `All sets hit ${repMax} reps with low back pain — add ${weightIncrement} kg to ${next} kg.`,
    };
  }

  if (allHitTop && painFlag) {
    return {
      action: "hold",
      tone: "info",
      suggestedWeight: topWeight,
      message:
        "Reps are there, but keep the weight steady this exercise is back-sensitive.",
    };
  }

  if (allAtLeastMin) {
    return {
      action: "build",
      tone: "info",
      suggestedWeight: topWeight,
      message: `Stay at ${topWeight} kg and push toward ${repMax} reps on every set.`,
    };
  }

  return {
    action: "hold",
    tone: "info",
    suggestedWeight: topWeight,
    message: `Keep ${topWeight} kg until you clear ${repMin}+ reps on all sets.`,
  };
}

function round(value: number, increment: number): number {
  if (increment <= 0) return Math.round(value);
  return Math.round(value / increment) * increment;
}
