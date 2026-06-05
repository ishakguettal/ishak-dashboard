import Link from "next/link";
import { Bell } from "lucide-react";
import type { Alert } from "@/lib/utils/reminders";
import { cn } from "@/lib/utils/cn";

const TONE: Record<Alert["tone"], string> = {
  info: "border-primary/30 bg-primary/10 text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function AlertBadges({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bell className="size-4 text-muted" />
      {alerts.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80",
            TONE[a.tone],
          )}
        >
          {a.label}
          {a.detail ? (
            <span className="opacity-70">· {a.detail}</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
