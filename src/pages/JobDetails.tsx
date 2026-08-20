import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, MessageSquare, Pencil, Sparkles, Trash2, UserX } from "lucide-react";
import { JOB_STATUSES, type JobRow, type JobStatus } from "../lib/db";
import { jobsService } from "../services/jobs";
import { useAuth } from "../hooks/useAuth";
import { Avatar, Button, EmptyState, SkeletonRows, STATUS_META, StatusPill, cn } from "../components/ui";
import { ConfirmDialog, useToast } from "../components/overlay";
import { JobFormModal } from "../components/jobs/JobFormModal";
import { AnalysisPanel } from "../components/jobs/AnalysisPanel";
import { InterviewPanel } from "../components/interview/InterviewPanel";

type Tab = "overview" | "analysis" | "interview";

const TABS: Array<{ id: Tab; label: string; icon: typeof Sparkles }> = [
  { id: "overview", label: "Overview", icon: CalendarDays },
  { id: "analysis", label: "AI Analysis", icon: Sparkles },
  { id: "interview", label: "Interview Prep", icon: MessageSquare },
];

export function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [statusBusy, setStatusBusy] = useState<JobStatus | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      setJob(await jobsService.get(user.id, id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this application.");
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (status: JobStatus) => {
    if (!user || !job || status === job.status) return;
    setStatusBusy(status);
    try {
      const updated = await jobsService.update(user.id, job.id, { status });
      setJob(updated);
      push("success", `Status changed to ${status}.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not update the status.");
    } finally {
      setStatusBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!user || !job) return;
    setDeleteBusy(true);
    try {
      await jobsService.remove(user.id, job.id);
      push("success", "Application deleted.");
      navigate("/jobs");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not delete the application.");
      setDeleteBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-40 rounded-xl" />
        <div className="skeleton h-10 w-72 rounded-lg" />
        <SkeletonRows count={2} height="h-28" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <EmptyState
        icon={<UserX className="h-5 w-5" />}
        title="Application not found"
        body={error ?? "This application does not exist or belongs to another account."}
        action={
          <Link to="/jobs" className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-mist-50 hover:bg-ink-700">
            <ArrowLeft className="h-4 w-4" />
            Back to applications
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="anim-fade-up rounded-xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
        <Link to="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-ink-400 transition-colors hover:text-ink-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          All applications
        </Link>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={job.company_name} className="h-14 w-14 rounded-xl text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{job.job_title}</h2>
              <StatusPill status={job.status} />
            </div>
            <p className="mt-1 text-sm font-semibold text-ink-600">{job.company_name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Added {new Date(job.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
              <span>Updated {new Date(job.updated_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status pipeline */}
        <div className="mt-5 border-t border-ink-100 pt-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">Move through the pipeline</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Change application status">
            {JOB_STATUSES.map((s) => {
              const active = job.status === s;
              return (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={statusBusy !== null}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition-all",
                    active ? cn(STATUS_META[s].pill, "shadow-sm") : "bg-white text-ink-400 ring-ink-200 hover:text-ink-700 hover:ring-ink-300",
                    statusBusy !== null && "opacity-60",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
                  {statusBusy === s ? "Saving…" : s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="anim-fade-up d-1 flex gap-1 overflow-x-auto border-b border-ink-200/70" role="tablist" aria-label="Application sections">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            role="tab"
            aria-selected={tab === tabId}
            onClick={() => setTab(tabId)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-bold transition-colors",
              tab === tabId ? "text-signal-700" : "text-ink-400 hover:text-ink-700",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={cn("absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-signal-500 transition-opacity", tab === tabId ? "opacity-100" : "opacity-0")} />
          </button>
        ))}
      </div>

      <div key={tab} className="anim-fade-in">
        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Job description</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{job.job_description}</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Details</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-400">Company</dt>
                    <dd className="font-semibold text-ink-800">{job.company_name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-400">Location</dt>
                    <dd className="font-semibold text-ink-800">{job.location || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-400">Status</dt>
                    <dd>
                      <StatusPill status={job.status} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-400">Tracked since</dt>
                    <dd className="font-semibold text-ink-800">{new Date(job.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-signal-200/70 bg-signal-50/60 p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-signal-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Next best move
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-signal-700/90">
                  {job.status === "Saved"
                    ? "Run the AI analysis to check the fit — then apply with a tailored resume."
                    : job.status === "Applied"
                      ? "Applied? Start interview prep now so you are ready when they call."
                      : job.status === "Interview"
                        ? "Interview stage: drill the generated questions and evaluate your answers."
                        : job.status === "Offer"
                          ? "Offer on the table — congratulations! Compare it against your priorities."
                          : "Log what you learned from this one, then line up the next posting."}
                </p>
                <button onClick={() => setTab(job.status === "Saved" || job.status === "Applied" ? "analysis" : "interview")} className="mt-3 text-xs font-bold text-signal-700 underline decoration-signal-300 underline-offset-2 hover:text-signal-600">
                  {job.status === "Saved" || job.status === "Applied" ? "Go to AI Analysis →" : "Go to Interview Prep →"}
                </button>
              </div>
            </div>
          </div>
        )}
        {tab === "analysis" && <AnalysisPanel job={job} />}
        {tab === "interview" && <InterviewPanel job={job} />}
      </div>

      <JobFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        job={job}
        onSaved={(updated) => setJob(updated)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete application?"
        body={
          <>
            This permanently removes <strong>{job.job_title}</strong> at <strong>{job.company_name}</strong>, including its AI analyses and interview
            sessions.
          </>
        }
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
