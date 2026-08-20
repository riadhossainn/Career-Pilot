import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ChevronRight, Inbox, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { JOB_STATUSES, type JobRow, type JobStatus } from "../lib/db";
import { jobsService } from "../services/jobs";
import { aiService } from "../services/ai";
import { useAuth } from "../hooks/useAuth";
import { Avatar, Button, EmptyState, Select, SkeletonRows, StatusPill, TextInput, cn, scoreColor } from "../components/ui";
import { ConfirmDialog, useToast } from "../components/overlay";
import { JobFormModal } from "../components/jobs/JobFormModal";

export function Jobs() {
  const { user } = useAuth();
  const { push } = useToast();
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | JobStatus>("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRow | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [jobRows, analyses] = await Promise.all([jobsService.list(user.id), aiService.listAnalyses(user.id)]);
        if (cancelled) return;
        const latest: Record<string, number> = {};
        for (const a of analyses) if (!(a.job_id in latest)) latest[a.job_id] = a.match_score;
        setJobs(jobRows);
        setScores(latest);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not load your applications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "All" && j.status !== statusFilter) return false;
      if (!q) return true;
      return `${j.company_name} ${j.job_title} ${j.location}`.toLowerCase().includes(q);
    });
  }, [jobs, search, statusFilter]);

  const handleSaved = (job: JobRow) => {
    setJobs((prev) => {
      if (!prev) return [job];
      const exists = prev.some((j) => j.id === job.id);
      return exists ? prev.map((j) => (j.id === job.id ? job : j)) : [job, ...prev];
    });
  };

  const confirmDelete = async () => {
    if (!user || !deletingJob) return;
    setDeleteBusy(true);
    try {
      await jobsService.remove(user.id, deletingJob.id);
      setJobs((prev) => (prev ? prev.filter((j) => j.id !== deletingJob.id) : prev));
      push("success", `Deleted the ${deletingJob.job_title} application.`);
      setDeletingJob(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not delete the application.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const hasFilters = search.trim() !== "" || statusFilter !== "All";

  return (
    <div className="space-y-5">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Application board</h2>
          <p className="mt-1 text-sm text-ink-500">Every posting you are tracking, from Saved to Offer.</p>
        </div>
        <Button
          onClick={() => {
            setEditingJob(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New application
        </Button>
      </div>

      <div className="anim-fade-up d-1 flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <TextInput
            aria-label="Search applications"
            className="pl-9"
            placeholder="Search by company, title or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select aria-label="Filter by status" className="sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | JobStatus)}>
          <option value="All">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <SkeletonRows count={4} height="h-36" />
      ) : error ? (
        <EmptyState icon={<Inbox className="h-5 w-5" />} title="Radar malfunction" body={error} />
      ) : jobs && jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-5 w-5" />}
          title="No applications yet"
          body="Start tracking your search: add a posting, then run the AI analysis to see how it fits your resume."
          action={
            <Button
              onClick={() => {
                setEditingJob(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add your first application
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={<Search className="h-5 w-5" />}
          title="Nothing matches those filters"
          body="Try a different search term or switch the status filter back to all."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {filtered.map((job, i) => {
            const score = scores[job.id];
            return (
              <div
                key={job.id}
                className={cn("anim-fade-up group relative rounded-xl border border-ink-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-signal-200 hover:shadow-md", i < 4 && `d-${(i % 4) + 1}`)}
              >
                <Link to={`/jobs/${job.id}`} className="block p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={job.company_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-display text-[15px] font-bold text-ink-900 group-hover:text-signal-700">{job.job_title}</h3>
                        <StatusPill status={job.status} className="shrink-0" />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-ink-500">{job.company_name}</p>
                      {job.location && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-500">{job.job_description}</p>
                  <div className="mt-3.5 flex items-center gap-2 border-t border-ink-100/80 pt-3">
                    <span className="text-[11px] font-semibold text-ink-400">
                      Added {new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {typeof score === "number" && (
                      <span
                        className="rounded-md px-2 py-0.5 font-display text-[11px] font-bold tabular-nums text-white"
                        style={{ backgroundColor: scoreColor(score) }}
                        title="Latest AI match score"
                      >
                        {score}% match
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <button
                        aria-label={`Edit ${job.job_title} at ${job.company_name}`}
                        title="Edit"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingJob(job);
                          setFormOpen(true);
                        }}
                        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-mist-100 hover:text-ink-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label={`Delete ${job.job_title} at ${job.company_name}`}
                        title="Delete"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeletingJob(job);
                        }}
                        className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="ml-0.5 inline-flex items-center gap-1 text-xs font-bold text-pine-600 opacity-70 transition-opacity group-hover:opacity-100">
                        Open
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <JobFormModal open={formOpen} onClose={() => setFormOpen(false)} job={editingJob} onSaved={handleSaved} />

      <ConfirmDialog
        open={!!deletingJob}
        title="Delete application?"
        body={
          <>
            This permanently removes <strong>{deletingJob?.job_title}</strong> at <strong>{deletingJob?.company_name}</strong>, including its AI
            analyses and interview sessions.
          </>
        }
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingJob(null)}
      />
    </div>
  );
}
