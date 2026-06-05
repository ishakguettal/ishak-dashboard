# Life HQ — Personal Dashboard

A private, mobile-friendly, permanently-dark life dashboard: Daily HQ, Goals & Tasks,
Workouts (with back-pain & progressive-overload tracking), Health (water / supplements /
sleep / bodyweight), CS Career, Finance, and Reflection.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Supabase (Postgres + Auth) · Recharts · deployed on Vercel.

---

## One-time setup

### 1. Create the Supabase project & schema
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql),
   and run it. This creates every table, Row Level Security policy, triggers, indexes,
   and a signup trigger that seeds a default Push/Pull/Legs split.
3. **Authentication → Users → Add user**: create your single account (email + password).
   The trigger auto-creates your profile, health profile, and weekly split.
4. **Authentication → Sign In / Providers**: turn **off** public sign-ups so no one else
   can register.

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

No service-role key is used anywhere — all access is user-scoped through RLS.

### 3. Run locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## Deploy to Vercel
1. Push this repo to GitHub and import it in Vercel.
2. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in **Project → Settings → Environment Variables**.
3. Deploy. The build uses Turbopack (no extra config needed).

---

## How it works

- **Auth & security** — `proxy.ts` (Next 16's replacement for `middleware`) refreshes the
  Supabase session on every request and redirects unauthenticated users to `/login`.
  Every table is protected by RLS keyed to `auth.uid()`.
- **Data flow** — Server Components read data with a request-scoped Supabase client
  (`lib/supabase/server.ts`); all writes go through Server Actions (`actions.ts` per
  section) that `revalidatePath` afterwards.
- **Dates** — "today / this week / streak" are computed in **Asia/Dubai** (`lib/utils/date.ts`).
- **Smart features** —
  - Water target from weight, training load and caffeine (`lib/utils/water.ts`).
  - Progressive-overload coach that backs off when back pain is high (`lib/utils/overload.ts`).
  - Day completion % and streak (`lib/utils/streak.ts`).
  - In-app reminder badges for supplements, renewals, follow-ups, overdue tasks
    (`lib/utils/reminders.ts`).

## Project structure
```
app/
  (auth)/login        # login page + auth actions
  auth/callback        # email/recovery code exchange
  (app)/               # protected shell + 7 section pages, each with actions.ts
components/            # ui primitives, layout, charts, per-section components
lib/                   # supabase clients, utils, types, constants
supabase/schema.sql    # full database schema to run once
proxy.ts               # session refresh + route protection
```

Tunables (water formula, renewal warning window, etc.) live in `lib/constants.ts`.
