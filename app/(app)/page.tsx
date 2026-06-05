import { createClient } from "@/lib/supabase/server";
import { DailySync } from "@/components/daily/DailySync";
import { PulseRing } from "@/components/daily/PulseRing";
import { TasksPanel } from "@/components/daily/TasksPanel";
import { HealthRow } from "@/components/daily/HealthRow";
import { WorkoutCard } from "@/components/daily/WorkoutCard";
import { AlertsRow } from "@/components/daily/AlertsRow";
import {
  todayISO,
  weekdayOf,
  addDaysISO,
  daysUntil,
  formatDateLong,
} from "@/lib/utils/date";
import { computeWaterTarget } from "@/lib/utils/water";
import { currentStreak, dayCompletion, type DayTally } from "@/lib/utils/streak";
import { projectDayScore, dayScoreLabel } from "@/lib/utils/dayscore";
import { RENEWAL_WARNING_DAYS } from "@/lib/constants";
import type { Task } from "@/lib/types/db";

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
  const tomorrow = addDaysISO(today, 1);
  const weekday = weekdayOf(today);

  const [
    profileRes,
    healthRes,
    todayTasksRes,
    tomorrowTasksRes,
    waterRes,
    suppRes,
    suppLogRes,
    scheduleRes,
    sessionTodayRes,
    sessionsRes,
    sleepRes,
    dailyLogRes,
    dailyLogsRes,
    subsRes,
    appsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle(),
    supabase.from("health_profile").select("*").maybeSingle(),
    supabase
      .from("tasks")
      .select("id,title,priority,status,due_date")
      .eq("due_date", today),
    supabase
      .from("tasks")
      .select("id,title,priority,status,due_date")
      .eq("due_date", tomorrow),
    supabase.from("water_logs").select("amount_ml").eq("log_date", today),
    supabase
      .from("supplements")
      .select("id,name,schedule,reminder_time,timing")
      .eq("active", true)
      .order("sort_order"),
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
      .select("id,back_pain")
      .eq("session_date", today)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("session_date,back_pain")
      .order("session_date", { ascending: false })
      .limit(20),
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
    supabase.from("applications").select("follow_up_date,deadline,status"),
  ]);

  const profile = profileRes.data ?? {};
  const dayStart: string = profile.day_start_time ?? "08:00";
  const dayEnd: string = profile.day_end_time ?? "23:30";

  const health = healthRes.data ?? {};
  const waterTarget = computeWaterTarget(health);
  const waterTotal = (waterRes.data ?? []).reduce(
    (s, w: { amount_ml: number }) => s + w.amount_ml,
    0,
  );

  const todayTasks = (todayTasksRes.data ?? []) as Task[];
  const tomorrowTasks = (tomorrowTasksRes.data ?? []) as Task[];
  const tasksDone = todayTasks.filter((t) => t.status === "done").length;

  const activeSupps = (suppRes.data ?? []).filter(
    (s: { schedule: string }) => dueToday(s.schedule, weekday),
  );
  const takenIds = new Set(
    (suppLogRes.data ?? [])
      .filter((l: { taken: boolean }) => l.taken)
      .map((l: { supplement_id: string }) => l.supplement_id),
  );
  const supplements = activeSupps.map(
    (s: {
      id: string;
      name: string;
      reminder_time: string | null;
      timing: string | null;
    }) => ({
      id: s.id,
      name: s.name,
      reminder_time: s.reminder_time,
      timing: s.timing,
      taken: takenIds.has(s.id),
    }),
  );
  const pendingSupplements = supplements.filter((s) => !s.taken);

  const schedule = scheduleRes.data;
  const plannedType = schedule?.workout_type ?? "rest";
  const isRestDay = plannedType === "rest";
  const isTrainingDay = !isRestDay;
  const sessionToday = sessionTodayRes.data;
  const sessionExists = !!sessionToday;

  const allSessions = (sessionsRes.data ?? []) as {
    session_date: string;
    back_pain: number | null;
  }[];
  const lastBackPain = allSessions[0]?.back_pain ?? null;
  const sessionDates = new Set(allSessions.map((s) => s.session_date));
  let consecutiveDays = 0;
  let cursor = sessionDates.has(today) ? today : addDaysISO(today, -1);
  while (sessionDates.has(cursor)) {
    consecutiveDays += 1;
    cursor = addDaysISO(cursor, -1);
  }

  const sleepToday = sleepRes.data;
  const dailyLog = dailyLogRes.data;
  const moodLogged = dailyLog?.mood != null && dailyLog?.energy != null;

  // Overall day completion (for ring fill, live score & streak history).
  const tallies: DayTally[] = [
    {
      label: "Tasks",
      applicable: todayTasks.length > 0,
      done: todayTasks.length > 0 && tasksDone === todayTasks.length,
    },
    { label: "Water", done: waterTotal >= waterTarget },
    {
      label: "Supplements",
      applicable: supplements.length > 0,
      done: pendingSupplements.length === 0,
    },
    { label: "Workout", applicable: isTrainingDay, done: sessionExists },
    { label: "Sleep", done: !!sleepToday },
    { label: "Reflection", done: moodLogged },
  ];
  const completion = dayCompletion(tallies);

  const logs = (dailyLogsRes.data ?? []) as {
    log_date: string;
    completion_pct: number;
  }[];
  const merged = [
    { log_date: today, completion_pct: completion },
    ...logs.filter((l) => l.log_date !== today),
  ];
  const streak = currentStreak(merged, today);

  const projected = projectDayScore({
    tasksTotal: todayTasks.length,
    sleepQuality: sleepToday?.quality ?? null,
    isRestDay,
    sessionExists,
    activeSupplements: supplements.length,
  });
  const projectedLabel = dayScoreLabel(projected, isRestDay);

  // Alerts data
  const apps = (appsRes.data ?? []) as {
    follow_up_date: string | null;
    deadline: string | null;
    status: string;
  }[];
  const isActiveApp = (s: string) =>
    !["rejected", "accepted", "withdrawn"].includes(s);
  const careerFollowups = apps.filter(
    (a) =>
      isActiveApp(a.status) &&
      a.follow_up_date != null &&
      daysUntil(a.follow_up_date, today) <= 0,
  ).length;
  const careerDeadlines = apps.filter((a) => {
    if (!isActiveApp(a.status) || a.deadline == null) return false;
    const d = daysUntil(a.deadline, today);
    return d >= 0 && d <= 7;
  }).length;

  const subs = (subsRes.data ?? []) as {
    next_renewal: string | null;
    amount: number;
  }[];
  const soonSubs = subs.filter((s) => {
    if (!s.next_renewal) return false;
    const d = daysUntil(s.next_renewal, today);
    return d >= 0 && d <= RENEWAL_WARNING_DAYS;
  });
  const subsTotalAED = soonSubs.reduce((s, x) => s + Number(x.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <DailySync logDate={today} pct={completion} />

      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Daily HQ</h1>
        <p className="mt-0.5 text-sm text-muted">{formatDateLong(today)}</p>
      </div>

      {/* Pulse + Tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PulseRing
          dayStart={dayStart}
          dayEnd={dayEnd}
          completion={completion}
          streak={streak}
          projected={projected}
          projectedLabel={projectedLabel}
        />
        <TasksPanel
          today={today}
          tomorrow={tomorrow}
          todayTasks={todayTasks}
          tomorrowTasks={tomorrowTasks}
        />
      </div>

      {/* Health row */}
      <HealthRow
        today={today}
        waterTotal={waterTotal}
        waterTarget={waterTarget}
        supplements={supplements}
        sleep={sleepToday ?? null}
      />

      {/* Workout + Alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkoutCard
          plannedType={plannedType}
          isRestDay={isRestDay}
          sessionExists={sessionExists}
          consecutiveDays={consecutiveDays}
          lastBackPain={lastBackPain}
        />
        <AlertsRow
          careerFollowups={careerFollowups}
          careerDeadlines={careerDeadlines}
          subsCount={soonSubs.length}
          subsTotalAED={subsTotalAED}
          moodLogged={moodLogged}
          mood={dailyLog?.mood ?? null}
          energy={dailyLog?.energy ?? null}
        />
      </div>
    </div>
  );
}
