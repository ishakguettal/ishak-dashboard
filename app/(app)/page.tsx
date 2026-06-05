import { createClient } from "@/lib/supabase/server";
import { DailySync } from "@/components/daily/DailySync";
import { HeroRow } from "@/components/daily/HeroRow";
import { type SmartData } from "@/components/daily/SmartPanel";
import { TodayTasks } from "@/components/daily/TodayTasks";
import { PlanTomorrow } from "@/components/daily/PlanTomorrow";
import { HealthStrip } from "@/components/daily/HealthStrip";
import { LifeStrip } from "@/components/daily/LifeStrip";
import { WorkoutCard } from "@/components/daily/WorkoutCard";
import { ActivityStrip } from "@/components/daily/ActivityStrip";
import {
  todayISO,
  weekdayOf,
  addDaysISO,
  daysUntil,
  weekStartISO,
  TZ,
} from "@/lib/utils/date";
import { computeWaterTarget } from "@/lib/utils/water";
import {
  currentStreak,
  longestStreak,
  dayCompletion,
  type DayTally,
} from "@/lib/utils/streak";
import { projectDayScore, dayScoreLabel } from "@/lib/utils/dayscore";
import { suggestOverload } from "@/lib/utils/overload";
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

function dubaiNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const h = get("hour");
  return (h === 24 ? 0 : h) * 60 + get("minute");
}

function toMin(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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
    accountsRes,
    exercisesRes,
    setsRes,
    overdueTasksRes,
    sleep7Res,
    bodyWeightsRes,
    schedExRes,
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
      .select("id,workout_type,custom_name,label")
      .eq("weekday", weekday)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id,back_pain,completed")
      .eq("session_date", today)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("session_date,back_pain,workout_type,completed")
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
      .limit(120),
    supabase
      .from("subscriptions")
      .select("id,name,next_renewal,amount,auto_renew")
      .eq("active", true),
    supabase
      .from("applications")
      .select("company,follow_up_date,deadline,status"),
    supabase.from("accounts").select("balance"),
    supabase
      .from("exercises")
      .select(
        "id,name,target_rep_min,target_rep_max,weight_increment,is_back_sensitive",
      ),
    supabase
      .from("workout_sets")
      .select("reps,weight,is_warmup,exercise_id,workout_sessions(session_date)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("tasks")
      .select("title")
      .lt("due_date", today)
      .eq("status", "todo")
      .order("due_date")
      .limit(20),
    supabase
      .from("sleep_logs")
      .select("hours,quality,log_date")
      .order("log_date", { ascending: false })
      .limit(7),
    supabase
      .from("body_weights")
      .select("weight_kg,recorded_on")
      .order("recorded_on", { ascending: false })
      .limit(10),
    supabase
      .from("schedule_exercises")
      .select("schedule_id,sort_order,exercises(name)")
      .order("sort_order"),
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

  // ---- Supplements ----
  const activeSupps = (suppRes.data ?? []).filter((s: { schedule: string }) =>
    dueToday(s.schedule, weekday),
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

  const nowMin = dubaiNowMinutes();
  const overdueSuppNames = pendingSupplements
    .filter((s) => {
      const due = toMin(s.reminder_time);
      return due != null && nowMin > due;
    })
    .map((s) => s.name);
  const upcomingSuppNames = pendingSupplements
    .filter((s) => {
      const due = toMin(s.reminder_time);
      return due == null || nowMin <= due;
    })
    .map((s) => s.name);
  const takenSuppNames = supplements.filter((s) => s.taken).map((s) => s.name);

  // ---- Workout ----
  const schedule = scheduleRes.data;
  const plannedType = schedule?.workout_type ?? "rest";
  const customName: string | null = schedule?.custom_name ?? null;
  const scheduleId: string | null = schedule?.id ?? null;
  const isRestDay = plannedType === "rest";
  const isTrainingDay = !isRestDay;

  // Today's planned exercises (names), for the workout card chips.
  const schedExAll = (schedExRes.data ?? []) as unknown as {
    schedule_id: string;
    sort_order: number;
    exercises: { name: string } | null;
  }[];
  const plannedExercises = scheduleId
    ? schedExAll
        .filter((r) => r.schedule_id === scheduleId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => r.exercises?.name)
        .filter((n): n is string => !!n)
    : [];

  const sessionToday = sessionTodayRes.data as
    | { id: string; back_pain: number | null; completed: boolean }
    | null;
  const backToday = sessionToday?.back_pain ?? null;

  const allSessions = (sessionsRes.data ?? []) as {
    session_date: string;
    back_pain: number | null;
    workout_type: string | null;
    completed: boolean;
  }[];

  // Most recent recorded back-pain (workout or check-in).
  const lastBackPain =
    allSessions.find((s) => s.back_pain != null)?.back_pain ?? null;

  const setRows = (setsRes.data ?? []) as unknown as {
    reps: number | null;
    weight: number | null;
    is_warmup: boolean;
    exercise_id: string | null;
    workout_sessions: { session_date: string } | null;
  }[];

  // A session counts as a real workout if it's marked completed or has logged
  // sets — so a bare back-pain check-in (an uncompleted, set-less row) never
  // poses as a finished workout.
  const datesWithSets = new Set(
    setRows
      .map((r) => r.workout_sessions?.session_date)
      .filter((d): d is string => !!d),
  );
  const isTrainingSession = (s: { session_date: string; completed: boolean }) =>
    s.completed || datesWithSets.has(s.session_date);
  const workoutDone =
    sessionToday != null &&
    (sessionToday.completed === true || datesWithSets.has(today));

  // Consecutive training days ending today.
  const trainingSessions = allSessions.filter(isTrainingSession);
  const trainingDates = new Set(trainingSessions.map((s) => s.session_date));
  let consecutiveDays = 0;
  let cursor = trainingDates.has(today) ? today : addDaysISO(today, -1);
  while (trainingDates.has(cursor)) {
    consecutiveDays += 1;
    cursor = addDaysISO(cursor, -1);
  }

  const lastWorkout = trainingSessions[0]
    ? {
        type: trainingSessions[0].workout_type,
        daysAgo: daysUntil(today, trainingSessions[0].session_date),
      }
    : null;

  // ---- Progressive-overload hint ----
  const recentBackPains = allSessions
    .map((s) => s.back_pain)
    .filter((p): p is number => p != null)
    .slice(0, 2);

  const exercises = (exercisesRes.data ?? []) as {
    id: string;
    name: string;
    target_rep_min: number;
    target_rep_max: number;
    weight_increment: number;
    is_back_sensitive: boolean;
  }[];
  const exMap = new Map(exercises.map((e) => [e.id, e]));

  // Working sets from each exercise's most recent session.
  const latestByExercise = new Map<
    string,
    { date: string; sets: { reps: number | null; weight: number | null }[] }
  >();
  for (const r of setRows) {
    if (!r.exercise_id || r.is_warmup) continue;
    const date = r.workout_sessions?.session_date;
    if (!date) continue;
    const cur = latestByExercise.get(r.exercise_id);
    if (!cur || date > cur.date) {
      latestByExercise.set(r.exercise_id, {
        date,
        sets: [{ reps: r.reps, weight: r.weight }],
      });
    } else if (date === cur.date) {
      cur.sets.push({ reps: r.reps, weight: r.weight });
    }
  }

  let overloadHint: { name: string; weight: number } | null = null;
  for (const [exId, g] of latestByExercise) {
    const ex = exMap.get(exId);
    if (!ex) continue;
    const advice = suggestOverload({
      lastWorkingSets: g.sets,
      repMin: ex.target_rep_min,
      repMax: ex.target_rep_max,
      weightIncrement: Number(ex.weight_increment),
      recentBackPain: recentBackPains,
      isBackSensitive: ex.is_back_sensitive,
    });
    if (advice.action === "increase") {
      overloadHint = { name: ex.name, weight: advice.suggestedWeight ?? 0 };
      break;
    }
  }

  // ---- Sleep / mood ----
  const sleepToday = sleepRes.data;
  const dailyLog = dailyLogRes.data;
  const moodLogged = dailyLog?.mood != null && dailyLog?.energy != null;

  // ---- Day completion, streak, score ----
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
    { label: "Workout", applicable: isTrainingDay, done: workoutDone },
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
  const bestStreak = longestStreak(merged);

  // Activity stats over the visible 16-week window (Mon-anchored).
  const activityMap = new Map(merged.map((l) => [l.log_date, l.completion_pct]));
  const activityStart = addDaysISO(weekStartISO(today), -15 * 7);
  let activityEntries = 0;
  let completedDays = 0;
  let activitySum = 0;
  for (let i = 0; i < 16 * 7; i++) {
    const d = addDaysISO(activityStart, i);
    if (d > today) continue;
    const pct = activityMap.get(d);
    if (pct == null) continue;
    activityEntries += 1;
    activitySum += pct;
    if (pct >= 100) completedDays += 1;
  }
  const completionRate = activityEntries
    ? Math.round(activitySum / activityEntries)
    : 0;

  const dayScore = projectDayScore({
    tasksTotal: todayTasks.length,
    sleepQuality: sleepToday?.quality ?? null,
    isRestDay,
    sessionExists: workoutDone,
    activeSupplements: supplements.length,
  });
  const dayScoreText = dayScoreLabel(dayScore, isRestDay);

  // ---- Career ----
  const apps = (appsRes.data ?? []) as {
    company: string;
    follow_up_date: string | null;
    deadline: string | null;
    status: string;
  }[];
  const isActiveApp = (s: string) =>
    !["rejected", "accepted", "withdrawn"].includes(s);
  const activeApps = apps.filter((a) => isActiveApp(a.status));
  const careerFollowups = activeApps.filter(
    (a) => a.follow_up_date != null && daysUntil(a.follow_up_date, today) <= 0,
  ).length;

  let urgentApp: { company: string; status: string } | null = null;
  let urgentKey = Infinity;
  for (const a of activeApps) {
    const dates: number[] = [];
    if (a.follow_up_date) dates.push(daysUntil(a.follow_up_date, today));
    if (a.deadline) dates.push(daysUntil(a.deadline, today));
    const key = dates.length ? Math.min(...dates) : 999;
    if (key < urgentKey) {
      urgentKey = key;
      urgentApp = { company: a.company, status: a.status };
    }
  }

  // ---- Finance ----
  const accounts = (accountsRes.data ?? []) as { balance: number }[];
  const netWorth = accounts.reduce((s, a) => s + Number(a.balance ?? 0), 0);

  const subs = (subsRes.data ?? []) as {
    name: string;
    next_renewal: string | null;
    amount: number;
  }[];
  const soonSubs = subs
    .filter((s) => {
      if (!s.next_renewal) return false;
      const d = daysUntil(s.next_renewal, today);
      return d >= 0 && d <= RENEWAL_WARNING_DAYS;
    })
    .sort(
      (a, b) =>
        daysUntil(a.next_renewal!, today) - daysUntil(b.next_renewal!, today),
    );
  const subsTotalAED = soonSubs.reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const urgentSub = soonSubs[0]
    ? { name: soonSubs[0].name, days: daysUntil(soonSubs[0].next_renewal!, today) }
    : null;

  const overdueApplications = activeApps.filter(
    (a) =>
      (a.follow_up_date != null && daysUntil(a.follow_up_date, today) < 0) ||
      (a.deadline != null && daysUntil(a.deadline, today) < 0),
  ).length;

  // ---- Sleep window (7-day average) ----
  const sleep7 = (sleep7Res.data ?? []) as {
    hours: number | null;
    quality: number | null;
  }[];
  const sleepHoursVals = sleep7
    .map((s) => s.hours)
    .filter((h): h is number => h != null);
  const sleepAvg7 = sleepHoursVals.length
    ? Math.round((sleepHoursVals.reduce((a, b) => a + b, 0) / sleepHoursVals.length) * 10) / 10
    : 0;

  // ---- Body weight + 7-day trend ----
  const bodyWeights = (bodyWeightsRes.data ?? []) as {
    weight_kg: number;
    recorded_on: string;
  }[];
  const lastKg = bodyWeights[0]?.weight_kg ?? 0;
  const weekAgoCut = addDaysISO(today, -7);
  const prevWeightRow =
    bodyWeights.find((w) => w.recorded_on <= weekAgoCut) ??
    bodyWeights[bodyWeights.length - 1];
  const weightTrend7 =
    bodyWeights.length >= 2 && prevWeightRow
      ? Math.round((lastKg - prevWeightRow.weight_kg) * 10) / 10
      : 0;

  const overdueTaskTitles = (overdueTasksRes.data ?? [])
    .map((t: { title: string }) => t.title)
    .filter(Boolean);

  const back3 = allSessions
    .map((s) => s.back_pain)
    .filter((p): p is number => p != null)
    .slice(0, 3);

  const timeOfDay: SmartData["time_of_day"] =
    nowMin < 11 * 60
      ? "morning"
      : nowMin < 16 * 60
        ? "midday"
        : nowMin < 20 * 60
          ? "evening"
          : "night";

  const streakAtRisk =
    streak > 0 &&
    completion < 100 &&
    (timeOfDay === "evening" || timeOfDay === "night");

  const smart: SmartData = {
    tasks: {
      completed: tasksDone,
      total: todayTasks.length,
      overdue: overdueTaskTitles,
    },
    water: { current_ml: waterTotal, target_ml: waterTarget },
    supplements: {
      overdue: overdueSuppNames,
      upcoming: upcomingSuppNames,
      taken: takenSuppNames,
    },
    sleep: {
      last_hours: sleepToday?.hours ?? 0,
      last_quality: sleepToday?.quality ?? 0,
      avg_7day: sleepAvg7,
    },
    back_pain: { last_session: lastBackPain ?? 0, last_3_sessions: back3 },
    workout: {
      today_type: customName || plannedType,
      logged_today: workoutDone,
      days_since_last: lastWorkout ? lastWorkout.daysAgo : 999,
      is_rest_day: isRestDay,
    },
    career: {
      follow_ups_due: careerFollowups,
      overdue_applications: overdueApplications,
    },
    finance: {
      renewals_this_week: soonSubs.length,
      renewal_amount: subsTotalAED,
    },
    mood: {
      logged_today: moodLogged,
      last_mood: dailyLog?.mood ?? 0,
      last_energy: dailyLog?.energy ?? 0,
    },
    body_weight: { last_kg: lastKg, trend_7day: weightTrend7 },
    streak: { current: streak, at_risk: streakAtRisk },
    time_of_day: timeOfDay,
  };

  return (
    <div className="space-y-4">
      <DailySync logDate={today} pct={completion} />

      <HeroRow
        dayStart={dayStart}
        dayEnd={dayEnd}
        completion={completion}
        dayScore={dayScore}
        dayScoreLabel={dayScoreText}
        streak={streak}
        bestStreak={bestStreak}
        smart={smart}
      />

      <ActivityStrip
        logs={merged}
        today={today}
        completedDays={completedDays}
        completionRate={completionRate}
      />

      <div id="tasks" className="scroll-mt-4">
        <TodayTasks today={today} todayTasks={todayTasks} />
      </div>

      <PlanTomorrow tomorrow={tomorrow} tomorrowTasks={tomorrowTasks} />

      <div id="health" className="scroll-mt-4">
        <HealthStrip
          today={today}
          waterTotal={waterTotal}
          waterTarget={waterTarget}
          supplements={supplements}
          sleep={sleepToday ?? null}
          backToday={backToday}
          lastBackPain={lastBackPain}
        />
      </div>

      <div id="life" className="scroll-mt-4">
        <LifeStrip
          careerActive={activeApps.length}
          careerFollowups={careerFollowups}
          urgentApp={urgentApp}
          netWorth={netWorth}
          urgentSub={urgentSub}
          moodLogged={moodLogged}
          mood={dailyLog?.mood ?? null}
          energy={dailyLog?.energy ?? null}
        />
      </div>

      <WorkoutCard
        plannedType={plannedType}
        customName={customName}
        plannedExercises={plannedExercises}
        isRestDay={isRestDay}
        sessionExists={workoutDone}
        lastWorkout={lastWorkout}
        consecutiveDays={consecutiveDays}
        lastBackPain={lastBackPain}
        overloadHint={overloadHint}
      />
    </div>
  );
}
