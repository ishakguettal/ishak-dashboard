/**
 * Row types mirroring the Supabase schema (see the plan / SQL file).
 * Query results are cast to these at the call site, e.g.
 *   const { data } = await supabase.from("tasks").select("*");
 *   const tasks = (data ?? []) as Task[];
 */

export interface BaseRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  timezone: string;
  base_currency: string;
  summer_break_until: string | null;
  day_start_time: string;
  day_end_time: string;
  deload_active: boolean;
  deload_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface DailyLog extends BaseRow {
  log_date: string;
  mood: number | null;
  energy: number | null;
  completion_pct: number;
  notes: string | null;
}

export interface WeeklyReflection extends BaseRow {
  week_start: string;
  wins: string | null;
  challenges: string | null;
  notes: string | null;
  rating: number | null;
}

export interface Task extends BaseRow {
  title: string;
  notes: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string;
  status: "todo" | "done";
  completed_at: string | null;
  sort_order: number;
}

export interface SummerGoal extends BaseRow {
  title: string;
  description: string | null;
  category: string | null;
  target_date: string | null;
  progress: number;
  status: "active" | "done" | "dropped";
  sort_order: number;
}

export interface WeeklyTarget extends BaseRow {
  week_start: string;
  title: string;
  unit: string | null;
  target_value: number | null;
  current_value: number;
  status: "active" | "done" | "dropped";
  sort_order: number;
}

export type WorkoutTypeValue =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full_body"
  | "cardio"
  | "rest";

export interface WorkoutScheduleRow extends BaseRow {
  weekday: number;
  workout_type: WorkoutTypeValue;
  custom_name: string | null;
  label: string | null;
}

export interface ScheduleExercise extends BaseRow {
  schedule_id: string;
  exercise_id: string | null;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  sort_order: number;
  superset_group: string | null;
  is_back_sensitive: boolean;
}

export interface Exercise extends BaseRow {
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  target_rep_min: number;
  target_rep_max: number;
  weight_increment: number;
  is_back_sensitive: boolean;
  notes: string | null;
}

export interface WorkoutSession extends BaseRow {
  session_date: string;
  workout_type: WorkoutTypeValue | null;
  back_pain: number | null;
  duration_min: number | null;
  energy: number | null;
  completed: boolean;
  notes: string | null;
}

export interface WorkoutSet extends BaseRow {
  session_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  is_warmup: boolean;
}

export interface HealthProfile {
  user_id: string;
  weight_kg: number | null;
  height_cm: number | null;
  workout_hours_per_week: number;
  caffeine_mg: number;
  water_target_override_ml: number | null;
  created_at: string;
  updated_at: string;
}

export interface WaterLog extends BaseRow {
  log_date: string;
  amount_ml: number;
  logged_at: string;
}

export interface Supplement extends BaseRow {
  name: string;
  dosage: string | null;
  timing:
    | "morning"
    | "afternoon"
    | "evening"
    | "pre_workout"
    | "post_workout"
    | "with_meal"
    | "before_bed"
    | null;
  schedule: string;
  reminder_time: string | null;
  active: boolean;
  notes: string | null;
  sort_order: number;
}

export interface SupplementLog extends BaseRow {
  supplement_id: string;
  log_date: string;
  taken: boolean;
  taken_at: string | null;
}

export interface SleepLog extends BaseRow {
  log_date: string;
  hours: number | null;
  quality: number | null;
  bedtime: string | null;
  wake_time: string | null;
  notes: string | null;
}

export interface BodyWeight extends BaseRow {
  recorded_on: string;
  weight_kg: number;
  body_fat_pct: number | null;
  notes: string | null;
}

export interface Application extends BaseRow {
  company: string;
  role: string | null;
  status:
    | "wishlist"
    | "applied"
    | "online_assessment"
    | "interview"
    | "offer"
    | "accepted"
    | "rejected"
    | "withdrawn";
  applied_date: string | null;
  deadline: string | null;
  follow_up_date: string | null;
  location: string | null;
  work_mode: string | null;
  link: string | null;
  salary: string | null;
  contact: string | null;
  notes: string | null;
  sort_order: number;
}

export interface PortfolioTask extends BaseRow {
  title: string;
  description: string | null;
  project: string | null;
  status: "backlog" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  link: string | null;
  sort_order: number;
}

export interface StudySession extends BaseRow {
  session_date: string;
  category: "leetcode" | "course" | "project" | "reading" | "other" | null;
  topic: string | null;
  platform: string | null;
  problems_solved: number | null;
  difficulty: "easy" | "medium" | "hard" | null;
  duration_min: number | null;
  notes: string | null;
}

export interface Account extends BaseRow {
  name: string;
  type: "bank" | "cash" | "savings" | "investment" | "broker" | "other";
  balance: number;
  currency: string;
  is_liquid: boolean;
  notes: string | null;
  sort_order: number;
}

export interface Subscription extends BaseRow {
  name: string;
  amount: number;
  currency: string;
  billing_cycle: "weekly" | "monthly" | "quarterly" | "yearly";
  next_renewal: string | null;
  payment_method: string | null;
  category: string | null;
  auto_renew: boolean;
  active: boolean;
  notes: string | null;
}

export interface Order extends BaseRow {
  item: string;
  vendor: string | null;
  amount: number | null;
  currency: string;
  order_date: string | null;
  status: "ordered" | "shipped" | "delivered" | "returned" | "cancelled";
  tracking: string | null;
  expected_date: string | null;
  link: string | null;
  notes: string | null;
}

export interface WishlistItem extends BaseRow {
  item: string;
  price: number | null;
  currency: string;
  url: string | null;
  priority: "low" | "medium" | "high";
  category: string | null;
  purchased: boolean;
  notes: string | null;
  sort_order: number;
}
