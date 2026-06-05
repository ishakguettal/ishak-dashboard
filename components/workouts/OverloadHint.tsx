import { TrendingUp, Minus, AlertTriangle, Target } from "lucide-react";
import type { OverloadAdvice } from "@/lib/utils/overload";
import { cn } from "@/lib/utils/cn";

const TONE = {
  success: "text-success",
  info: "text-muted",
  warning: "text-warning",
} as const;

export function OverloadHint({ advice }: { advice: OverloadAdvice }) {
  const Icon =
    advice.action === "increase"
      ? TrendingUp
      : advice.action === "deload"
        ? AlertTriangle
        : advice.action === "build"
          ? Target
          : Minus;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs", TONE[advice.tone])}>
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>{advice.message}</span>
    </p>
  );
}
