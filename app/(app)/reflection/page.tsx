import { Smile, LineChart as LineIcon, NotebookPen, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoodEnergyForm } from "@/components/reflection/MoodEnergyForm";
import { MoodTrend } from "@/components/charts/MoodTrend";
import { todayISO, weekStartISO, formatDateShort } from "@/lib/utils/date";
import type { DailyLog, WeeklyReflection } from "@/lib/types/db";
import { saveWeeklyReflection, deleteWeeklyReflection } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReflectionPage() {
  const supabase = await createClient();
  const today = todayISO();
  const currentWeek = weekStartISO();

  const [logsRes, reflectionsRes] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("log_date,mood,energy,notes")
      .order("log_date", { ascending: false })
      .limit(30),
    supabase
      .from("weekly_reflections")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(12),
  ]);

  const logs = (logsRes.data ?? []) as Pick<
    DailyLog,
    "log_date" | "mood" | "energy" | "notes"
  >[];
  const todayLog = logs.find((l) => l.log_date === today) ?? null;
  const chart = [...logs]
    .reverse()
    .map((l) => ({
      label: formatDateShort(l.log_date),
      mood: l.mood,
      energy: l.energy,
    }));

  const reflections = (reflectionsRes.data ?? []) as WeeklyReflection[];
  const current = reflections.find((r) => r.week_start === currentWeek) ?? null;
  const past = reflections.filter((r) => r.week_start !== currentWeek);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Reflection</h1>
        <p className="mt-0.5 text-sm text-muted">
          Check in daily, zoom out weekly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Today's check-in" icon={Smile} />
          <MoodEnergyForm
            mood={todayLog?.mood ?? null}
            energy={todayLog?.energy ?? null}
            notes={todayLog?.notes ?? null}
          />
        </Card>

        <Card>
          <CardHeader title="Mood & energy trend" icon={LineIcon} />
          <MoodTrend data={chart} />
        </Card>
      </div>

      {/* Weekly reflection */}
      <Card>
        <CardHeader
          title={`This week · from ${formatDateShort(currentWeek)}`}
          icon={NotebookPen}
        />
        <form action={saveWeeklyReflection} className="space-y-3">
          <input type="hidden" name="week_start" value={currentWeek} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Wins">
              <Textarea
                name="wins"
                rows={2}
                defaultValue={current?.wins ?? ""}
                placeholder="What went well?"
              />
            </Field>
            <Field label="Challenges">
              <Textarea
                name="challenges"
                rows={2}
                defaultValue={current?.challenges ?? ""}
                placeholder="What was hard?"
              />
            </Field>
          </div>
          <Field label="Notes & next week">
            <Textarea
              name="notes"
              rows={2}
              defaultValue={current?.notes ?? ""}
              placeholder="Anything else on your mind"
            />
          </Field>
          <div className="flex items-end gap-3">
            <Field label="Week rating (1-10)" className="w-40">
              <Input
                name="rating"
                type="number"
                min={1}
                max={10}
                defaultValue={current?.rating ?? ""}
              />
            </Field>
            <SubmitButton size="sm">Save week</SubmitButton>
          </div>
        </form>
      </Card>

      {/* Past reflections */}
      <Card>
        <CardHeader title="Past weeks" icon={NotebookPen} />
        {past.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No past reflections"
            hint="Your weekly notes will collect here."
          />
        ) : (
          <div className="space-y-3">
            {past.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-surface-2/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Week of {formatDateShort(r.week_start)}
                  </span>
                  {r.rating != null ? (
                    <Badge className="border-primary/30 bg-primary/10 text-primary">
                      {r.rating}/10
                    </Badge>
                  ) : null}
                  <form action={deleteWeeklyReflection} className="ml-auto">
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="rounded p-1 text-muted hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
                <div className="mt-1.5 space-y-1 text-xs text-muted">
                  {r.wins ? (
                    <p>
                      <span className="text-success">Wins:</span> {r.wins}
                    </p>
                  ) : null}
                  {r.challenges ? (
                    <p>
                      <span className="text-warning">Challenges:</span>{" "}
                      {r.challenges}
                    </p>
                  ) : null}
                  {r.notes ? <p>{r.notes}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
