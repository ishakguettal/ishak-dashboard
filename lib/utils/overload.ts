export type OverloadAction = "increase" | "hold" | "build" | "deload" | "form";

export interface OverloadAdvice {
  action: OverloadAction;
  /** Short chip text, e.g. "+2.5kg ready", "Hold steady", "Consider deload". */
  label: string;
  /** Longer one-line explanation. */
  message: string;
  suggestedWeight?: number;
  tone: "success" | "info" | "warning";
}

type SetLite = { reps: number | null; weight: number | null };

export interface OverloadInput {
  /** Working sets from the most recent session for this exercise. */
  lastWorkingSets: SetLite[];
  /** Working sets from the session before that (optional, enables 2-session rule). */
  prevWorkingSets?: SetLite[];
  repMin: number;
  repMax: number;
  weightIncrement: number;
  /** Back-pain ratings (1-10) from up to the last 2 sessions, newest first. */
  recentBackPain: number[];
  isBackSensitive: boolean;
}

/**
 * Progressive-overload coach. Mindful of the L5-S1 disc: never suggests a load
 * increase when recent back pain is high, and recommends a deload instead.
 *
 * Increase rule: all working sets hit the top of the rep range in the last
 * *two* sessions AND back pain ≤ 4 in both → +weight_increment.
 */
export function suggestOverload(input: OverloadInput): OverloadAdvice {
  const { repMin, repMax, weightIncrement, recentBackPain, isBackSensitive } =
    input;
  const sets = input.lastWorkingSets.filter((s) => (s.reps ?? 0) > 0);

  if (sets.length === 0) {
    return {
      action: "hold",
      tone: "info",
      label: "No data",
      message: "Log a working set to start tracking progress.",
    };
  }

  const topWeight = Math.max(...sets.map((s) => Number(s.weight ?? 0)));
  const highPain = recentBackPain.some((p) => p >= 7);

  if (highPain) {
    const w = round(topWeight * 0.9, weightIncrement);
    return {
      action: "deload",
      tone: "warning",
      label: "Consider deload",
      suggestedWeight: w,
      message: `Back pain was high recently — deload ~10% to about ${w}kg and prioritise form.`,
    };
  }

  const prev = (input.prevWorkingSets ?? []).filter((s) => (s.reps ?? 0) > 0);
  const allHitTopLast = sets.every((s) => (s.reps ?? 0) >= repMax);
  const allHitTopPrev =
    prev.length === 0 ? true : prev.every((s) => (s.reps ?? 0) >= repMax);
  const backOk =
    recentBackPain.length === 0 ? true : recentBackPain.every((p) => p <= 4);
  const belowMin = sets.some((s) => (s.reps ?? 0) < repMin);

  if (allHitTopLast && allHitTopPrev && backOk && !isBackSensitive) {
    const next = topWeight + weightIncrement;
    return {
      action: "increase",
      tone: "success",
      label: `+${weightIncrement}kg ready`,
      suggestedWeight: next,
      message: `Top of the range hit with low back pain — add ${weightIncrement}kg to ${next}kg.`,
    };
  }

  if (allHitTopLast && isBackSensitive) {
    return {
      action: "hold",
      tone: "info",
      label: "Hold steady",
      suggestedWeight: topWeight,
      message:
        "Reps are there, but this lift is back-sensitive — keep the weight steady.",
    };
  }

  if (belowMin) {
    return {
      action: "form",
      tone: "warning",
      label: "Form check",
      suggestedWeight: topWeight,
      message: `Reps dropped below ${repMin} — check form and hold ${topWeight}kg until they return.`,
    };
  }

  return {
    action: "hold",
    tone: "info",
    label: "Hold steady",
    suggestedWeight: topWeight,
    message: `Stay at ${topWeight}kg and push toward ${repMax} reps on every set.`,
  };
}

function round(value: number, increment: number): number {
  if (increment <= 0) return Math.round(value);
  return Math.round(value / increment) * increment;
}
