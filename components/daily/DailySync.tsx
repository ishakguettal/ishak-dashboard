"use client";

import { useEffect, useRef } from "react";
import { syncDailyCompletion, syncDailyScore } from "@/app/(app)/actions";

/**
 * Fire-and-forget on load: records today's completion % (streak history) and
 * today's day score (daily_scores → streak + best run).
 */
export function DailySync({
  logDate,
  pct,
  score,
}: {
  logDate: string;
  pct: number;
  score: number;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void syncDailyCompletion(logDate, pct);
    void syncDailyScore(logDate, score);
  }, [logDate, pct, score]);
  return null;
}
