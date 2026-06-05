import { RENEWAL_WARNING_DAYS } from "@/lib/constants";
import { daysUntil, relativeDay, todayISO } from "./date";

export type AlertTone = "info" | "warning" | "danger";

export interface Alert {
  id: string;
  kind: "supplement" | "subscription" | "followup" | "task" | "deadline";
  label: string;
  detail?: string;
  tone: AlertTone;
  href: string;
}

export interface AlertInputs {
  pendingSupplements: { id: string; name: string }[];
  subscriptions: {
    id: string;
    name: string;
    next_renewal: string | null;
    amount: number;
    auto_renew: boolean;
  }[];
  applications: {
    id: string;
    company: string;
    follow_up_date: string | null;
    deadline: string | null;
  }[];
  overdueTasks: { id: string; title: string }[];
}

/** Builds the in-app reminder badges shown on the Daily HQ and section headers. */
export function buildAlerts(input: AlertInputs, today = todayISO()): Alert[] {
  const alerts: Alert[] = [];

  for (const s of input.pendingSupplements) {
    alerts.push({
      id: `supp-${s.id}`,
      kind: "supplement",
      label: `Take ${s.name}`,
      tone: "info",
      href: "/health",
    });
  }

  for (const sub of input.subscriptions) {
    if (!sub.next_renewal) continue;
    const d = daysUntil(sub.next_renewal, today);
    if (d < 0 || d > RENEWAL_WARNING_DAYS) continue;
    alerts.push({
      id: `sub-${sub.id}`,
      kind: "subscription",
      label: `${sub.name} renews ${relativeDay(sub.next_renewal, today)}`,
      detail: sub.auto_renew ? "Auto-deducts" : undefined,
      tone: d <= 2 ? "danger" : "warning",
      href: "/finance",
    });
  }

  for (const app of input.applications) {
    if (app.follow_up_date && daysUntil(app.follow_up_date, today) <= 0) {
      alerts.push({
        id: `follow-${app.id}`,
        kind: "followup",
        label: `Follow up with ${app.company}`,
        tone: "warning",
        href: "/career",
      });
    }
    if (app.deadline) {
      const d = daysUntil(app.deadline, today);
      if (d >= 0 && d <= 3) {
        alerts.push({
          id: `deadline-${app.id}`,
          kind: "deadline",
          label: `${app.company} deadline ${relativeDay(app.deadline, today)}`,
          tone: d <= 1 ? "danger" : "warning",
          href: "/career",
        });
      }
    }
  }

  if (input.overdueTasks.length > 0) {
    alerts.push({
      id: "overdue-tasks",
      kind: "task",
      label: `${input.overdueTasks.length} overdue task${
        input.overdueTasks.length > 1 ? "s" : ""
      }`,
      tone: "danger",
      href: "/goals",
    });
  }

  return alerts;
}
