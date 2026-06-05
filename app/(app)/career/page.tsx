import {
  Briefcase,
  KanbanSquare,
  GraduationCap,
  Trash2,
  ExternalLink,
  BellRing,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Textarea, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormModal } from "@/components/ui/FormModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutoSubmitSelect } from "@/components/ui/AutoSubmit";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_STYLES,
  PORTFOLIO_STATUSES,
  STUDY_CATEGORIES,
  PRIORITIES,
  PRIORITY_STYLES,
} from "@/lib/constants";
import { todayISO, weekStartISO, relativeDay, daysUntil, formatDateShort } from "@/lib/utils/date";
import { titleize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Application, PortfolioTask, StudySession } from "@/lib/types/db";
import {
  addApplication,
  updateApplicationStatus,
  deleteApplication,
  addPortfolioTask,
  movePortfolioTask,
  deletePortfolioTask,
  addStudySession,
  deleteStudySession,
} from "./actions";

export const dynamic = "force-dynamic";

const COLUMN_LABEL: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export default async function CareerPage() {
  const supabase = await createClient();
  const today = todayISO();
  const weekStart = weekStartISO();

  const [appsRes, portfolioRes, studyRes] = await Promise.all([
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("portfolio_tasks").select("*").order("created_at"),
    supabase
      .from("study_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .limit(30),
  ]);

  const applications = (appsRes.data ?? []) as Application[];
  const portfolio = (portfolioRes.data ?? []) as PortfolioTask[];
  const study = (studyRes.data ?? []) as StudySession[];

  const weekStudy = study.filter((s) => s.session_date >= weekStart);
  const problemsThisWeek = weekStudy.reduce(
    (n, s) => n + (s.problems_solved ?? 0),
    0,
  );
  const minutesThisWeek = weekStudy.reduce(
    (n, s) => n + (s.duration_min ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">CS Career</h1>
        <p className="mt-0.5 text-sm text-muted">
          Applications, portfolio &amp; study.
        </p>
      </div>

      {/* Applications */}
      <Card>
        <CardHeader
          title={`Applications (${applications.length})`}
          icon={Briefcase}
          action={
            <FormModal title="New application" action={addApplication}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company">
                  <Input name="company" required placeholder="Acme" />
                </Field>
                <Field label="Role">
                  <Input name="role" placeholder="SWE Intern" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select name="status" defaultValue="applied">
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {titleize(s)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Applied date">
                  <Input name="applied_date" type="date" defaultValue={today} />
                </Field>
                <Field label="Deadline">
                  <Input name="deadline" type="date" />
                </Field>
                <Field label="Follow-up date">
                  <Input name="follow_up_date" type="date" />
                </Field>
                <Field label="Location">
                  <Input name="location" placeholder="Dubai" />
                </Field>
                <Field label="Work mode">
                  <Input name="work_mode" placeholder="Hybrid" />
                </Field>
                <Field label="Link">
                  <Input name="link" type="url" placeholder="https://" />
                </Field>
                <Field label="Salary">
                  <Input name="salary" placeholder="AED" />
                </Field>
              </div>
              <Field label="Notes">
                <Textarea name="notes" />
              </Field>
            </FormModal>
          }
        />
        {applications.length === 0 ? (
          <EmptyState icon={Briefcase} title="No applications" hint="Track your first one." />
        ) : (
          <div className="space-y-2">
            {applications.map((a) => {
              const followDue =
                a.follow_up_date != null &&
                daysUntil(a.follow_up_date, today) <= 0 &&
                !["rejected", "accepted", "withdrawn"].includes(a.status);
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-border bg-surface-2/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.company}</span>
                    {a.role ? (
                      <span className="text-sm text-muted">· {a.role}</span>
                    ) : null}
                    {followDue ? (
                      <Badge className="border-warning/30 bg-warning/10 text-warning">
                        <BellRing className="size-3" /> follow up
                      </Badge>
                    ) : null}
                    <form
                      action={updateApplicationStatus}
                      className="ml-auto flex items-center gap-2"
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <AutoSubmitSelect
                        name="status"
                        defaultValue={a.status}
                        className={cn(
                          "h-8 w-40 py-1 text-xs",
                          APPLICATION_STATUS_STYLES[a.status],
                        )}
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {titleize(s)}
                          </option>
                        ))}
                      </AutoSubmitSelect>
                    </form>
                    <form action={deleteApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="rounded p-1 text-muted hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {a.deadline ? (
                      <span>Deadline {relativeDay(a.deadline, today)}</span>
                    ) : null}
                    {a.follow_up_date ? (
                      <span>Follow-up {relativeDay(a.follow_up_date, today)}</span>
                    ) : null}
                    {a.location ? <span>{a.location}</span> : null}
                    {a.work_mode ? <span>{a.work_mode}</span> : null}
                    {a.salary ? <span>{a.salary}</span> : null}
                    {a.link ? (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        link <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                  {a.notes ? (
                    <p className="mt-1 text-xs text-muted">{a.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Portfolio board */}
      <Card>
        <CardHeader
          title="Portfolio board"
          icon={KanbanSquare}
          action={
            <FormModal title="New portfolio task" action={addPortfolioTask}>
              <Field label="Title">
                <Input name="title" required placeholder="Build project page" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Project">
                  <Input name="project" placeholder="Portfolio v2" />
                </Field>
                <Field label="Priority">
                  <Select name="priority" defaultValue="medium">
                    {PRIORITIES.filter((p) => p !== "urgent").map((p) => (
                      <option key={p} value={p}>
                        {titleize(p)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Link">
                <Input name="link" type="url" placeholder="https://" />
              </Field>
              <Field label="Description">
                <Textarea name="description" />
              </Field>
            </FormModal>
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PORTFOLIO_STATUSES.map((col) => {
            const items = portfolio.filter((t) => t.status === col);
            return (
              <div
                key={col}
                className="rounded-lg border border-border bg-surface-2/30 p-2"
              >
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {COLUMN_LABEL[col]} · {items.length}
                </p>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-md border border-border bg-surface p-2"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium">{t.title}</p>
                        <form action={deletePortfolioTask}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            className="rounded p-0.5 text-muted hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </form>
                      </div>
                      {t.project ? (
                        <p className="text-xs text-muted">{t.project}</p>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge className={PRIORITY_STYLES[t.priority]}>
                          {titleize(t.priority)}
                        </Badge>
                        {t.link ? (
                          <a
                            href={t.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                      </div>
                      <form action={movePortfolioTask} className="mt-2">
                        <input type="hidden" name="id" value={t.id} />
                        <AutoSubmitSelect
                          name="status"
                          defaultValue={t.status}
                          className="h-7 py-0.5 text-xs"
                        >
                          {PORTFOLIO_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {COLUMN_LABEL[s]}
                            </option>
                          ))}
                        </AutoSubmitSelect>
                      </form>
                    </div>
                  ))}
                  {items.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-muted/60">Empty</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Study log */}
      <Card>
        <CardHeader
          title="Study log"
          icon={GraduationCap}
          action={
            <span className="text-xs text-muted">
              This week: {problemsThisWeek} problems · {minutesThisWeek}m
            </span>
          }
        />
        <form
          action={addStudySession}
          className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-7"
        >
          <Field label="Date" className="col-span-2 sm:col-span-1">
            <Input name="session_date" type="date" defaultValue={today} />
          </Field>
          <Field label="Type">
            <Select name="category" defaultValue="leetcode">
              {STUDY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {titleize(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Topic" className="col-span-2 sm:col-span-1">
            <Input name="topic" placeholder="Arrays" />
          </Field>
          <Field label="Platform">
            <Input name="platform" placeholder="LeetCode" />
          </Field>
          <Field label="Solved">
            <Input name="problems_solved" type="number" min={0} />
          </Field>
          <Field label="Difficulty">
            <Select name="difficulty" defaultValue="">
              <option value="">—</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </Field>
          <div className="col-span-2 flex items-end gap-2 sm:col-span-7">
            <Field label="Minutes" className="w-28">
              <Input name="duration_min" type="number" min={0} />
            </Field>
            <SubmitButton size="sm">
              <Plus className="size-4" /> Log session
            </SubmitButton>
          </div>
        </form>

        {study.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No study sessions" hint="Log your first." />
        ) : (
          <ul className="divide-y divide-border">
            {study.slice(0, 12).map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-14 text-xs text-muted">
                  {formatDateShort(s.session_date)}
                </span>
                {s.category ? (
                  <Badge className="border-border bg-surface-2 text-muted">
                    {titleize(s.category)}
                  </Badge>
                ) : null}
                <span className="min-w-0 flex-1 truncate">
                  {s.topic ?? "—"}
                  {s.platform ? (
                    <span className="text-muted"> · {s.platform}</span>
                  ) : null}
                </span>
                {s.problems_solved != null ? (
                  <span className="text-xs text-muted">
                    {s.problems_solved} solved
                  </span>
                ) : null}
                {s.difficulty ? (
                  <span className="text-xs text-muted">{titleize(s.difficulty)}</span>
                ) : null}
                {s.duration_min != null ? (
                  <span className="text-xs text-muted">{s.duration_min}m</span>
                ) : null}
                <form action={deleteStudySession}>
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
        )}
      </Card>
    </div>
  );
}
