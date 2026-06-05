-- ============================================================
-- Personal Life Dashboard — full schema, RLS, triggers, seed
-- Run once in the Supabase SQL Editor.
-- Single-user app; every table isolated by auth.uid() via RLS.
-- ============================================================
create extension if not exists pgcrypto;          -- gen_random_uuid()

-- updated_at helper -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ===================== PROFILE / SETTINGS =========================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  timezone      text not null default 'Asia/Dubai',
  base_currency text not null default 'AED',
  summer_break_until date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ===================== DAILY HQ / REFLECTION ======================
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date date not null,
  mood smallint check (mood between 1 and 10),
  energy smallint check (energy between 1 and 10),
  completion_pct numeric(5,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  wins text, challenges text, notes text,
  rating smallint check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ===================== GOALS & TASKS ==============================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_date date not null default current_date,
  status text not null default 'todo' check (status in ('todo','done')),
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.summer_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  target_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active','done','dropped')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  title text not null,
  unit text,
  target_value numeric,
  current_value numeric not null default 0,
  status text not null default 'active' check (status in ('active','done','dropped')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===================== WORKOUTS ===================================
create table public.workout_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),   -- 0=Sun .. 6=Sat
  workout_type text not null check (workout_type in
    ('push','pull','legs','upper','lower','full_body','cardio','rest')),
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weekday)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text,
  equipment text,
  target_rep_min smallint not null default 8,
  target_rep_max smallint not null default 12,
  weight_increment numeric not null default 2.5,
  is_back_sensitive boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  workout_type text check (workout_type in
    ('push','pull','legs','upper','lower','full_body','cardio','rest')),
  back_pain smallint check (back_pain between 1 and 10),   -- L5-S1 tracking
  duration_min int,
  energy smallint check (energy between 1 and 10),
  completed boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text,                       -- snapshot if exercise later deleted
  set_number smallint not null default 1,
  reps smallint,
  weight numeric,
  rpe smallint check (rpe between 1 and 10),
  is_warmup boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===================== HEALTH =====================================
create table public.health_profile (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  weight_kg numeric,
  height_cm numeric,
  workout_hours_per_week numeric not null default 5,
  caffeine_mg int not null default 0,
  water_target_override_ml int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  amount_ml int not null check (amount_ml > 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  dosage text,
  timing text check (timing in
    ('morning','afternoon','evening','pre_workout','post_workout','with_meal','before_bed')),
  schedule text not null default 'daily',   -- 'daily' or CSV of weekdays e.g. '1,3,5'
  reminder_time time,
  active boolean not null default true,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  log_date date not null default current_date,
  taken boolean not null default true,
  taken_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, supplement_id, log_date)
);

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date date not null,                   -- the morning you woke
  hours numeric(4,2),
  quality smallint check (quality between 1 and 10),
  bedtime time, wake_time time, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recorded_on date not null default current_date,
  weight_kg numeric not null,
  body_fat_pct numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recorded_on)
);

-- ===================== CS CAREER ==================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null,
  role text,
  status text not null default 'applied' check (status in
    ('wishlist','applied','online_assessment','interview','offer','accepted','rejected','withdrawn')),
  applied_date date,
  deadline date,
  follow_up_date date,
  location text, work_mode text, link text, salary text, contact text, notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text,
  project text,
  status text not null default 'backlog' check (status in ('backlog','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date, link text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  category text check (category in ('leetcode','course','project','reading','other')),
  topic text, platform text,
  problems_solved int,
  difficulty text check (difficulty is null or difficulty in ('easy','medium','hard')),
  duration_min int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===================== FINANCE (AED base, no crypto) =============
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'bank' check (type in
    ('bank','cash','savings','investment','broker','other')),
  balance numeric not null default 0,
  currency text not null default 'AED',
  is_liquid boolean not null default true,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  total numeric not null,
  breakdown jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  currency text not null default 'AED',
  billing_cycle text not null default 'monthly' check (billing_cycle in
    ('weekly','monthly','quarterly','yearly')),
  next_renewal date,
  payment_method text, category text,
  auto_renew boolean not null default true,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item text not null,
  vendor text,
  amount numeric,
  currency text not null default 'AED',
  order_date date default current_date,
  status text not null default 'ordered' check (status in
    ('ordered','shipped','delivered','returned','cancelled')),
  tracking text, expected_date date, link text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item text not null,
  price numeric,
  currency text not null default 'AED',
  url text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  category text,
  purchased boolean not null default false,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===================== RLS + updated_at (all user-scoped tables) ==
do $$
declare t text;
begin
  foreach t in array array[
    'daily_logs','weekly_reflections','tasks','summer_goals','weekly_targets',
    'workout_schedule','exercises','workout_sessions','workout_sets',
    'health_profile','water_logs','supplements','supplement_logs',
    'sleep_logs','body_weights','applications','portfolio_tasks','study_sessions',
    'accounts','net_worth_snapshots','subscriptions','orders','wishlist'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$create policy "own_rows" on public.%I for all to authenticated
                     using (auth.uid() = user_id) with check (auth.uid() = user_id);$p$, t);
    execute format('create trigger trg_%s_updated before update on public.%I
                     for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- profiles uses id (not user_id) as the owner column
alter table public.profiles enable row level security;
create policy "own_profile" on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ===================== INDEXES (hot query paths) =================
create index on public.daily_logs       (user_id, log_date desc);
create index on public.tasks            (user_id, due_date, status);
create index on public.workout_sessions (user_id, session_date desc);
create index on public.workout_sets     (session_id);
create index on public.workout_sets     (user_id, exercise_id);
create index on public.water_logs       (user_id, log_date);
create index on public.supplement_logs  (user_id, log_date);
create index on public.sleep_logs       (user_id, log_date desc);
create index on public.body_weights     (user_id, recorded_on desc);
create index on public.applications     (user_id, status);
create index on public.applications     (user_id, follow_up_date);
create index on public.subscriptions    (user_id, next_renewal);
create index on public.study_sessions   (user_id, session_date desc);

-- ===================== AUTO-PROVISION ON SIGNUP ==================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email,'@',1));
  insert into public.health_profile (user_id) values (new.id);
  insert into public.workout_schedule (user_id, weekday, workout_type, label) values
    (new.id, 0,'rest','Rest'),  (new.id, 1,'push','Push'), (new.id, 2,'pull','Pull'),
    (new.id, 3,'legs','Legs'),  (new.id, 4,'push','Push'), (new.id, 5,'pull','Pull'),
    (new.id, 6,'rest','Rest');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
