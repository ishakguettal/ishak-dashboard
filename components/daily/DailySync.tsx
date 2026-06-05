"use client";

import { useEffect, useRef } from "react";
import { syncDailyCompletion } from "@/app/(app)/actions";

/** Fire-and-forget: records today's completion % for streak history. */
export function DailySync({ logDate, pct }: { logDate: string; pct: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void syncDailyCompletion(logDate, pct);
  }, [logDate, pct]);
  return null;
}
