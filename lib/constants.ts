import {
  LayoutDashboard,
  CheckSquare,
  Dumbbell,
  HeartPulse,
  Briefcase,
  Wallet,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Daily HQ", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: CheckSquare },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/career", label: "Career", icon: Briefcase },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/reflection", label: "Reflection", icon: NotebookPen },
];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-surface-2 text-muted border-border",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-warning/15 text-warning border-warning/30",
  urgent: "bg-danger/15 text-danger border-danger/30",
};

export const WORKOUT_TYPES = [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full_body",
  "cardio",
  "rest",
] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const WORKOUT_TYPE_STYLES: Record<string, string> = {
  push: "bg-primary/15 text-primary border-primary/30",
  pull: "bg-accent/15 text-accent border-accent/30",
  legs: "bg-warning/15 text-warning border-warning/30",
  upper: "bg-primary/15 text-primary border-primary/30",
  lower: "bg-warning/15 text-warning border-warning/30",
  full_body: "bg-success/15 text-success border-success/30",
  cardio: "bg-accent/15 text-accent border-accent/30",
  rest: "bg-surface-2 text-muted border-border",
};

export const SUPPLEMENT_TIMINGS = [
  "morning",
  "afternoon",
  "evening",
  "pre_workout",
  "post_workout",
  "with_meal",
  "before_bed",
] as const;

export const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "online_assessment",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_STYLES: Record<string, string> = {
  wishlist: "bg-surface-2 text-muted border-border",
  applied: "bg-primary/15 text-primary border-primary/30",
  online_assessment: "bg-accent/15 text-accent border-accent/30",
  interview: "bg-warning/15 text-warning border-warning/30",
  offer: "bg-success/15 text-success border-success/30",
  accepted: "bg-success/20 text-success border-success/40",
  rejected: "bg-danger/15 text-danger border-danger/30",
  withdrawn: "bg-surface-2 text-muted border-border",
};

export const PORTFOLIO_STATUSES = [
  "backlog",
  "in_progress",
  "review",
  "done",
] as const;
export type PortfolioStatus = (typeof PORTFOLIO_STATUSES)[number];

export const STUDY_CATEGORIES = [
  "leetcode",
  "course",
  "project",
  "reading",
  "other",
] as const;

export const ACCOUNT_TYPES = [
  "bank",
  "cash",
  "savings",
  "investment",
  "broker",
  "other",
] as const;

export const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  bank: "#6366f1",
  cash: "#34d399",
  savings: "#22d3ee",
  investment: "#fbbf24",
  broker: "#a78bfa",
  other: "#9aa1b2",
};

export const BILLING_CYCLES = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export const ORDER_STATUSES = [
  "ordered",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
] as const;

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Tunable constants for the water-intake target formula (see water.ts). */
export const WATER = {
  perKg: 33, // ml per kg bodyweight
  perWorkoutHour: 500, // ml per weekly workout hour (daily-averaged)
  perCaffeine100mg: 120, // ml to offset each 100mg of caffeine
  min: 2000,
  max: 5000,
} as const;

export const QUICK_WATER_AMOUNTS = [250, 500, 750];

/** Days ahead within which a subscription renewal is flagged. */
export const RENEWAL_WARNING_DAYS = 7;
