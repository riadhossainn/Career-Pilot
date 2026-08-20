import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CalendarDays, Check, ChevronRight, ClipboardCheck, FileText, Inbox, ListChecks, Sparkles, UserX } from "lucide-react";
import { JOB_STATUSES, dbInterviews, type JobRow, type JobStatus } from "../lib/db";
import { jobsService } from "../services/jobs";
import { resumeService } from "../services/resume";
import { aiService } from "../services/ai";
import { useAuth } from "../hooks/useAuth";
import { Avatar, EmptyState, SkeletonRows, STATUS_META, StatusPill, cn } from "../components/ui";

function useCountUp(target: number, duration = 750): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCard({ icon, label, value, caption, tone }: { icon: ReactNode; label: string; value: number; caption: string; tone: string }) {
  const display = useCountUp(value);
  return (
    <div className="anim-fade-up rounded-xl border border-ink-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset", tone)}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-[2rem] font-bold leading-none tabular-nums text-ink-900">{display}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 text-[11px] text-ink-400">{caption}</p>
    </div>
  );
}

interface DeckData {
  jobs: JobRow[];
  hasResume: boolean;
  analysisCount: number;
  sessionCount: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [jobs, resume, analyses] = await Promise.all([jobsService.list(user.id), resumeService.get(user.id), aiService.listAnalyses(user.id)]);
        const sessionCounts = await Promise.all(jobs.map((j) => dbInterviews.countSessions(user.id, j.id)));
        if (cancelled) return;
        setData({
          jobs,
          hasResume: !!resume && resume.resume_text.trim().length > 0,
          analysisCount: analyses.length,
          sessionCount: sessionCounts.reduce((a, b) => a + b, 0),
        });
      } catch {
        if (!cancelled) setError("Could not load your dashboard. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name.split(" ")[0] ?? "pilot";

  const stats = useMemo(() => {
    if (!data) return null;
    const by = (s: JobStatus) => data.jobs.filter((j) => j.status === s).length;
    return {
      total: data.jobs.length,
      active: by("Saved") + by("Applied") + by("Interview"),
      interview: by("Interview"),
      rejected: by("Rejected"),
      byStatus: JOB_STATUSES.map((s) => ({ status: s, count: by(s) })),
      recent: data.jobs.slice(0, 5),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-16 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <SkeletonRows count={3} height="h-16" />
      </div>
    );
  }

  if (error || !stats || !data) {
    return (
      <EmptyState
        icon={<UserX className="h-5 w-5" />}
        title="Radar malfunction"
        body={error ?? "Something went wrong while loading your dashboard."}
        action={
          <button onClick={() => window.location.reload()} className="text-sm font-bold text-signal-600 hover:text-signal-500">
            Refresh the page
          </button>
        }
      />
    );
  }

  const checklist = [
    { done: data.hasResume, label: "Save your resume text", to: "/resume", icon: FileText },
    { done: data.jobs.length > 0, label: "Add your first application", to: "/jobs", icon: Briefcase },
    { done: data.analysisCount > 0, label: "Run an AI job analysis", to: data.jobs[0] ? `/jobs/${data.jobs[0].id}` : "/jobs", icon: Sparkles },
    { done: data.sessionCount > 0, label: "Practice an interview question", to: data.jobs[0] ? `/jobs/${data.jobs[0].id}` : "/jobs", icon: ClipboardCheck },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const showChecklist = doneCount < checklist.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="anim-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-[1.7rem]">
            {greeting}, {firstName}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · here is your application radar.
          </p>
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-semibold text-mist-50 transition-colors hover:bg-ink-700"
        >
          <Briefcase className="h-4 w-4 text-signal-400" />
          Open applications
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Inbox className="h-4 w-4" />} tone="bg-ink-50 text-ink-600 ring-ink-200" label="Total applications" value={stats.total} caption="Every tracked posting" />
        <StatCard icon={<Briefcase className="h-4 w-4" />} tone="bg-sky-50 text-sky-600 ring-sky-200" label="Active" value={stats.active} caption="Saved, applied or interviewing" />
        <StatCard icon={<CalendarDays className="h-4 w-4" />} tone="bg-amber-50 text-amber-600 ring-amber-200" label="Interviews" value={stats.interview} caption="In the interview stage" />
        <StatCard icon={<UserX className="h-4 w-4" />} tone="bg-rose-50 text-rose-600 ring-rose-200" label="Rejected" value={stats.rejected} caption="Closed — log it and move on" />
      </div>

      {/* Pipeline + checklist */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="anim-fade-up d-2 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-ink-900">Pipeline distribution</h3>
            <span className="text-[11px] font-semibold text-ink-400">{stats.total} total</span>
          </div>
          {stats.total === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-400">
              No applications yet — the pipeline lights up once you add one.
            </p>
          ) : (
            <>
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-mist-100">
                {stats.byStatus.map(
                  ({ status, count }) =>
                    count > 0 && (
                      <div
                        key={status}
                        className={cn("h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full", STATUS_META[status].bar)}
                        style={{ width: `${(count / stats.total) * 100}%` }}
                        title={`${status}: ${count}`}
                      />
                    ),
                )}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
                {stats.byStatus.map(({ status, count }) => (
                  <li key={status} className="flex items-center gap-2 text-xs font-semibold text-ink-600">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_META[status].dot)} />
                    {status}
                    <span className="ml-auto font-display tabular-nums text-ink-900">{count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {showChecklist ? (
          <div className="anim-fade-up d-3 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
                <ListChecks className="h-4 w-4 text-pine-600" />
                Preflight checklist
              </h3>
              <span className="font-display text-xs font-bold tabular-nums text-ink-400">{doneCount}/4</span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-mist-100">
              <div className="h-full rounded-full bg-pine-500 transition-all duration-700" style={{ width: `${(doneCount / 4) * 100}%` }} />
            </div>
            <ul className="space-y-1">
              {checklist.map(({ done, label, to, icon: Icon }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-mist-100",
                      done ? "text-ink-400" : "font-semibold text-ink-800",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors",
                        done ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-transparent ring-ink-200 group-hover:ring-pine-400",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <Icon className="h-3.5 w-3.5 text-ink-400" />
                    <span className={cn(done && "line-through decoration-ink-300")}>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="anim-fade-up d-3 flex flex-col justify-center rounded-xl border border-pine-200 bg-pine-50/60 p-5 shadow-sm">
            <p className="flex items-center gap-2 font-display text-sm font-bold text-pine-700">
              <Check className="h-4 w-4" />
              All preflight checks complete
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-pine-700/80">
              Resume saved, applications tracked, AI analysis run and interview practiced. Keep the streak going — add the next posting.
            </p>
          </div>
        )}
      </div>

      {/* Recent applications */}
      <div className="anim-fade-up d-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-ink-900">Recent applications</h3>
          <Link to="/jobs" className="inline-flex items-center gap-1 text-xs font-bold text-pine-600 hover:text-pine-700">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <EmptyState
            compact
            icon={<Inbox className="h-5 w-5" />}
            title="No applications yet"
            body="Add the first job you are eyeing — then let the AI score how well it fits your resume."
            action={
              <Link to="/jobs" className="inline-flex items-center gap-2 rounded-lg bg-signal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-signal-600/30 transition-colors hover:bg-signal-500">
                <Briefcase className="h-4 w-4" />
                Add application
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-ink-100/80 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
            {stats.recent.map((job) => (
              <li key={job.id}>
                <Link to={`/jobs/${job.id}`} className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-mist-50">
                  <Avatar name={job.company_name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-900">{job.job_title}</span>
                    <span className="block truncate text-xs text-ink-500">
                      {job.company_name}
                      {job.location ? ` · ${job.location}` : ""}
                    </span>
                  </span>
                  <span className="hidden text-xs text-ink-400 sm:block">
                    {new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <StatusPill status={job.status} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
