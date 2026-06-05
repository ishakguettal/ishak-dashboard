import {
  Droplets,
  Pill,
  Moon,
  Scale,
  Trash2,
  Check,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/Progress";
import { Input, Select, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormModal } from "@/components/ui/FormModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LineTrend } from "@/components/charts/LineTrend";
import { computeWaterTarget } from "@/lib/utils/water";
import { todayISO, formatDateShort } from "@/lib/utils/date";
import { titleize, formatWeight } from "@/lib/utils/format";
import { SUPPLEMENT_TIMINGS, QUICK_WATER_AMOUNTS } from "@/lib/constants";
import type {
  HealthProfile,
  WaterLog,
  Supplement,
  SupplementLog,
  SleepLog,
  BodyWeight,
} from "@/lib/types/db";
import {
  updateHealthProfile,
  addWater,
  deleteWater,
  addSupplement,
  deleteSupplement,
  toggleSupplement,
  addSleep,
  deleteSleep,
  addBodyWeight,
  deleteBodyWeight,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const supabase = await createClient();
  const today = todayISO();

  const [profileRes, waterRes, suppRes, suppLogRes, sleepRes, weightRes] =
    await Promise.all([
      supabase.from("health_profile").select("*").maybeSingle(),
      supabase
        .from("water_logs")
        .select("*")
        .eq("log_date", today)
        .order("logged_at", { ascending: false }),
      supabase
        .from("supplements")
        .select("*")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("supplement_logs").select("*").eq("log_date", today),
      supabase
        .from("sleep_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .limit(14),
      supabase
        .from("body_weights")
        .select("*")
        .order("recorded_on", { ascending: false })
        .limit(30),
    ]);

  const profile = (profileRes.data ?? {}) as Partial<HealthProfile>;
  const waterTarget = computeWaterTarget(profile);
  const waterLogs = (waterRes.data ?? []) as WaterLog[];
  const waterTotal = waterLogs.reduce((s, w) => s + w.amount_ml, 0);
  const waterPct = waterTarget ? (waterTotal / waterTarget) * 100 : 0;

  const supplements = (suppRes.data ?? []) as Supplement[];
  const suppLogs = (suppLogRes.data ?? []) as SupplementLog[];
  const takenMap = new Map(
    suppLogs.map((l) => [l.supplement_id, l.taken]),
  );

  const sleep = (sleepRes.data ?? []) as SleepLog[];
  const sleepChart = [...sleep]
    .reverse()
    .map((s) => ({ label: formatDateShort(s.log_date), hours: s.hours }));

  const weights = (weightRes.data ?? []) as BodyWeight[];
  const weightChart = [...weights]
    .reverse()
    .map((w) => ({ label: formatDateShort(w.recorded_on), weight: w.weight_kg }));
  const latestWeight = weights[0]?.weight_kg ?? profile.weight_kg ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Health</h1>
        <p className="mt-0.5 text-sm text-muted">
          Hydration, supplements, sleep &amp; bodyweight.
        </p>
      </div>

      {/* Water */}
      <Card>
        <CardHeader
          title="Water intake"
          icon={Droplets}
          action={
            <FormModal
              title="Hydration profile"
              triggerLabel="Settings"
              triggerVariant="outline"
              showIcon={false}
              action={updateHealthProfile}
            >
              <p className="text-xs text-muted">
                Your daily target is calculated from these. Leave the override
                blank to use the formula.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (kg)">
                  <Input
                    name="weight_kg"
                    type="number"
                    step="any"
                    defaultValue={profile.weight_kg ?? ""}
                  />
                </Field>
                <Field label="Workout hrs / week">
                  <Input
                    name="workout_hours_per_week"
                    type="number"
                    step="any"
                    defaultValue={profile.workout_hours_per_week ?? 5}
                  />
                </Field>
                <Field label="Caffeine (mg/day)">
                  <Input
                    name="caffeine_mg"
                    type="number"
                    defaultValue={profile.caffeine_mg ?? 0}
                  />
                </Field>
                <Field label="Override (ml)">
                  <Input
                    name="water_target_override_ml"
                    type="number"
                    placeholder="auto"
                    defaultValue={profile.water_target_override_ml ?? ""}
                  />
                </Field>
              </div>
            </FormModal>
          }
        />
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <ProgressRing
            value={waterPct}
            label={`${(waterTotal / 1000).toFixed(1)}L`}
            sublabel={`of ${(waterTarget / 1000).toFixed(1)}L`}
          />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_WATER_AMOUNTS.map((amt) => (
                <form key={amt} action={addWater}>
                  <input type="hidden" name="amount_ml" value={amt} />
                  <button
                    type="submit"
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium hover:border-primary/40"
                  >
                    +{amt}ml
                  </button>
                </form>
              ))}
              <form action={addWater} className="flex gap-1">
                <Input
                  name="amount_ml"
                  type="number"
                  placeholder="ml"
                  className="w-24"
                />
                <SubmitButton size="sm" variant="secondary">
                  Add
                </SubmitButton>
              </form>
            </div>
            <p className="text-xs text-muted">
              Target from {formatWeight(profile.weight_kg)} ·{" "}
              {profile.workout_hours_per_week ?? 0} h/wk training ·{" "}
              {profile.caffeine_mg ?? 0} mg caffeine.
            </p>
            {waterLogs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {waterLogs.map((w) => (
                  <form key={w.id} action={deleteWater}>
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      title="Remove"
                      className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted hover:text-danger"
                    >
                      {w.amount_ml}ml ✕
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Supplements */}
      <Card>
        <CardHeader
          title="Supplements"
          icon={Pill}
          action={
            <FormModal title="New supplement" action={addSupplement}>
              <Field label="Name">
                <Input name="name" required placeholder="e.g. Creatine" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dosage">
                  <Input name="dosage" placeholder="5 g" />
                </Field>
                <Field label="Timing">
                  <Select name="timing" defaultValue="morning">
                    {SUPPLEMENT_TIMINGS.map((t) => (
                      <option key={t} value={t}>
                        {titleize(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Notes">
                <Input name="notes" placeholder="Optional" />
              </Field>
            </FormModal>
          }
        />
        {supplements.length === 0 ? (
          <EmptyState icon={Pill} title="No supplements" hint="Add what you take." />
        ) : (
          <ul className="space-y-1.5">
            {supplements.map((s) => {
              const taken = takenMap.get(s.id) ?? false;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
                >
                  <form action={toggleSupplement} className="flex">
                    <input type="hidden" name="supplement_id" value={s.id} />
                    <input type="hidden" name="taken" value={String(taken)} />
                    <button
                      type="submit"
                      aria-label="Toggle taken"
                      className={
                        "flex size-5 items-center justify-center rounded-md border transition-colors " +
                        (taken
                          ? "border-success bg-success text-bg"
                          : "border-border hover:border-primary")
                      }
                    >
                      {taken ? <Check className="size-3.5" /> : null}
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={"text-sm " + (taken ? "text-muted" : "text-text")}>
                      {s.name}
                      {s.dosage ? (
                        <span className="text-muted"> · {s.dosage}</span>
                      ) : null}
                    </p>
                  </div>
                  {s.timing ? (
                    <Badge className="border-border bg-surface-2 text-muted">
                      {titleize(s.timing)}
                    </Badge>
                  ) : null}
                  <form action={deleteSupplement}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded p-1 text-muted hover:text-danger"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sleep */}
        <Card>
          <CardHeader title="Sleep" icon={Moon} />
          <form
            action={addSleep}
            className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            <Field label="Date" className="col-span-2 sm:col-span-1">
              <Input name="log_date" type="date" defaultValue={today} />
            </Field>
            <Field label="Hours">
              <Input name="hours" type="number" step="0.1" placeholder="7.5" />
            </Field>
            <Field label="Quality">
              <Input name="quality" type="number" min={1} max={10} placeholder="8" />
            </Field>
            <div className="flex items-end">
              <SubmitButton size="sm" className="w-full">
                <Plus className="size-4" /> Log
              </SubmitButton>
            </div>
          </form>

          <LineTrend data={sleepChart} dataKey="hours" unit="h" color="var(--color-accent)" />

          {sleep.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {sleep.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="w-14 text-xs text-muted">
                    {formatDateShort(s.log_date)}
                  </span>
                  <span className="tabular-nums">{s.hours ?? "—"}h</span>
                  {s.quality != null ? (
                    <Badge className="border-border bg-surface-2 text-muted">
                      {s.quality}/10
                    </Badge>
                  ) : null}
                  <form action={deleteSleep} className="ml-auto">
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded p-1 text-muted hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        {/* Body weight */}
        <Card>
          <CardHeader
            title="Body weight"
            icon={Scale}
            action={
              <span className="text-sm text-muted">
                {formatWeight(latestWeight)}
              </span>
            }
          />
          <form
            action={addBodyWeight}
            className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            <Field label="Date" className="col-span-2 sm:col-span-1">
              <Input name="recorded_on" type="date" defaultValue={today} />
            </Field>
            <Field label="Weight kg">
              <Input name="weight_kg" type="number" step="0.1" required />
            </Field>
            <Field label="Body fat %">
              <Input name="body_fat_pct" type="number" step="0.1" />
            </Field>
            <div className="flex items-end">
              <SubmitButton size="sm" className="w-full">
                <Plus className="size-4" /> Log
              </SubmitButton>
            </div>
          </form>

          <LineTrend data={weightChart} dataKey="weight" unit="kg" />

          {weights.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {weights.slice(0, 6).map((w) => (
                <li key={w.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="w-14 text-xs text-muted">
                    {formatDateShort(w.recorded_on)}
                  </span>
                  <span className="tabular-nums">{w.weight_kg}kg</span>
                  {w.body_fat_pct != null ? (
                    <span className="text-xs text-muted">
                      {w.body_fat_pct}% bf
                    </span>
                  ) : null}
                  <form action={deleteBodyWeight} className="ml-auto">
                    <input type="hidden" name="id" value={w.id} />
                    <button
                      type="submit"
                      className="rounded p-1 text-muted hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
