import Link from "next/link";
import {
  Flame,
  CheckSquare,
  Dumbbell,
  Droplets,
  Pill,
  Briefcase,
  Wallet,
  Moon,
  Smile,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/Progress";
import { AlertBadges } from "@/components/daily/AlertBadges";
import { DailySync } from "@/components/daily/DailySync";
import { todayISO, weekdayOf, formatDateLong } from "@/lib/utils/date";
import { computeWaterTarget } from "@/lib/utils/water";
import { currentStreak, dayCompletion, type DayTally } from "@/lib/utils/streak";
import { buildAlerts } from "@/lib/utils/reminders";
import { formatAED } from "@/lib/utils/format";
import { titleize } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function dueToday(schedule: string, weekday: number): boolean {
  if (schedule === "daily" || !schedule) return true;
  return schedule
    .split(",")
    .map((d) => Number(d.trim()))
    .includes(weekday);
}

export default async function DailyHQ() {
  const supabase = await createClient();
  const today = todayISO();
  const weekday = weekdayOf(today);

  const [
    healthRes,
    tasksRes,
    overdueRes,
    waterRes,
    supplementsRes,
    supplementLogsRes,
    scheduleRes,
    sessionRes,
    sleepRes,
    dailyLogRes,
    dailyLogsRes,
    subsRes,
    appsRes,
    accountsRes,
  ] = await Promise.all([
    supabase.from("health_profile").select("*").maybeSingle(),
    supabase.from("tasks").select("id,title,status,priority").eq("due_date", today),
    supabase
      .from("tasks")
      .select("id,title")
      .eq("status", "todo")
      .lt("due_date", today),
    supabase.from("water_logs").select("amount_ml").eq("log_date", today),
    supabase
      .from("supplements")
      .select("id,name,schedule")
      .eq("active", true),
    supabase
      .from("supplement_logs")
      .select("supplement_id,taken")
      .eq("log_date", today),
    supabase
      .from("workout_schedule")
      .select("workout_type,label")
      .eq("weekday", weekday)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id,back_pain,workout_type")
      .eq("session_date", today)
      .maybeSingle(),
    supabase
      .from("sleep_logs")
      .select("hours,quality")
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("mood,energy")
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("log_date,completion_pct")
      .order("log_date", { ascending: false })
      .limit(90),
    supabase
      .from("subscriptions")
      .select("id,name,next_renewal,amount,auto_renew")
      .eq("active", true),
    supabase.from("applications").select("id,company,follow_up_date,deadline,status"),
    supabase.from("accounts").select("balance,type"),
  ]);

  const health = healthRes.data ?? {};
  const tasksToday = tasksRes.data ?? [];
  const overdueTasks = overdueRes.data ?? [];
  const waterTotal = (waterRes.data ?? []).reduce(
    (sum, w: { amount_ml: number }) => sum + w.amount_ml,
    0,
  );
  const waterTarget = computeWaterTarget(health);
  const activeSupps = (supplementsRes.data ?? []).filter(
    (s: { schedule: string }) => dueToday(s.schedule, weekday),
  );
  const takenIds = new Set(
    (supplementLogsRes.data ?? [])
      .filter((l: { taken: boolean }) => l.taken)
      .map((l: { supplement_id: string }) => l.supplement_id),
  );
  const pendingSupplements = activeSupps.filter(
    (s: { id: string }) => !takenIds.has(s.id),
  );
  const schedule = scheduleRes.data;
  const isTrainingDay = !!schedule && schedule.workout_type !== "rest";
  const sessionToday = sessionRes.data;
  const sleepToday = sleepRes.data;
  const dailyLog = dailyLogRes.data;
  const moodLogged = dailyLog?.mood != null && dailyLog?.energy != null;

  const tasksDone = tasksToday.filter(
    (t: { status: string }) => t.status === "done",
  ).length;

  const tallies: DayTally[] = [
    {
      label: "Tasks",
      applicable: tasksToday.length > 0,
      done: tasksToday.length > 0 && tasksDone === tasksToday.length,
    },
    { label: "Water", done: waterTotal >= waterTarget },
    {
      label: "Supplements",
      applicable: activeSupps.length > 0,
      done: pendingSupplements.length === 0,
    },
    { label: "Workout", applicable: isTrainingDay, done: !!sessionToday },
    { label: "Sleep", done: !!sleepToday },
    { label: "Reflection", done: moodLogged },
  ];
  const completion = dayCompletion(tallies);

  const logs = (dailyLogsRes.data ?? []).map(
    (l: { log_date: string; completion_pct: number }) => ({ ...l }),
  );
  const merged = [
    { log_date: today, completion_pct: completion },
    ...logs.filter((l: { log_date: string }) => l.log_date !== today),
  ];
  const streak = currentStreak(merged, today);

  const apps = appsRes.data ?? [];
  const activeApps = apps.filter(
    (a: { status: string }) =>
      !["rejected", "withdrawn", "accepted"].includes(a.status),
  );
  const accounts = accountsRes.data ?? [];
  const netWorth = accounts.reduce(
    (sum, a: { balance: number }) => sum + Number(a.balance ?? 0),
    0,
  );

  const alerts = buildAlerts({
    pendingSupplements,
    subscriptions: subsRes.data ?? [],
    applications: apps,
    overdueTasks,
  });

  const cards = [
    {
      href: "/goals",
      icon: CheckSquare,
      label: "Tasks today",
      value:
        tasksToday.length > 0 ? `${tasksDone}/${tasksToday.length} done` : "None",
      tone: "text-primary",
    },
    {
      href: "/workouts",
      icon: Dumbbell,
      label: "Today",
      value: schedule
        ? titleize(schedule.label || schedule.workout_type)
        : "—",
      sub: sessionToday
        ? sessionToday.back_pain != null
          ? `Logged · back ${sessionToday.back_pain}/10`
          : "Logged"
        : isTrainingDay
          ? "Not logged"
          : "Rest day",
      tone: "text-accent",
    },
    {
      href: "/health",
      icon: Droplets,
      label: "Water",
      value: `${(waterTotal / 1000).toFixed(1)}L`,
      sub: `of ${(waterTarget / 1000).toFixed(1)}L`,
      tone: waterTotal >= waterTarget ? "text-success" : "text-text",
    },
    {
      href: "/health",
      icon: Pill,
      label: "Supplements",
      value:
        activeSupps.length > 0
          ? `${activeSupps.length - pendingSupplements.length}/${activeSupps.length}`
          : "None",
      tone:
        pendingSupplements.length === 0 && activeSupps.length > 0
          ? "text-success"
          : "text-text",
    },
    {
      href: "/career",
      icon: Briefcase,
      label: "Applications",
      value: `${activeApps.length} active`,
      tone: "text-text",
    },
    {
      href: "/finance",
      icon: Wallet,
      label: "Net worth",
      value: formatAED(netWorth),
      tone: "text-text",
    },
    {
      href: "/health",
      icon: Moon,
      label: "Sleep",
      value: sleepToday?.hours != null ? `${sleepToday.hours}h` : "—",
      sub: sleepToday?.quality != null ? `quality ${sleepToday.quality}/10` : "Not logged",
      tone: "text-text",
    },
    {
      href: "/reflection",
      icon: Smile,
      label: "Mood / Energy",
      value: moodLogged ? `${dailyLog!.mood} / ${dailyLog!.energy}` : "—",
      sub: moodLogged ? undefined : "Not logged",
      tone: "text-text",
    },
  ];

  return (
    <div className="space-y-6">
      <DailySync logDate={today} pct={completion} />

      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Daily HQ</h1>
        <p className="mt-0.5 text-sm text-muted">{formatDateLong(today)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center sm:w-56">
          <ProgressRing
            value={completion}
            label={`${completion}%`}
            sublabel="day complete"
          />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col justify-center gap-1">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Flame className="size-4 text-warning" /> Current streak
            </div>
            <p className="text-3xl font-bold tabular-nums">
              {streak}
              <span className="ml-1 text-base font-medium text-muted">
                day{streak === 1 ? "" : "s"}
              </span>
            </p>
            <p className="text-xs text-muted">100%-complete days in a row</p>
          </Card>
          <Card className="flex flex-col justify-center gap-2">
            <p className="text-sm text-muted">Today&apos;s goals</p>
            <div className="flex flex-wrap gap-1.5">
              {tallies
                .filter((t) => t.applicable !== false)
                .map((t) => (
                  <span
                    key={t.label}
                    className={
                      "rounded-full border px-2 py-0.5 text-xs font-medium " +
                      (t.done
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-border bg-surface-2 text-muted")
                    }
                  >
                    {t.label}
                  </span>
                ))}
            </div>
          </Card>
        </div>
      </div>

      {alerts.length > 0 ? (
        <Card>
          <AlertBadges alerts={alerts} />
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Link key={i} href={c.href}>
            <Card className="group h-full transition-colors hover:border-primary/40">
              <div className="mb-2 flex items-center justify-between">
                <c.icon className="size-4 text-muted" />
                <ArrowRight className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-xs text-muted">{c.label}</p>
              <p className={"text-lg font-semibold " + c.tone}>{c.value}</p>
              {c.sub ? <p className="text-xs text-muted">{c.sub}</p> : null}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
