import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, History, Minus, Sparkles } from "lucide-react";
import type { JobRow } from "../../lib/db";
import { aiService, type AnalysisRow } from "../../services/ai";
import { resumeService } from "../../services/resume";
import { useAuth } from "../../hooks/useAuth";
import { Button, CategoryChip, Gauge, SkeletonRows, cn, scoreColor } from "../ui";
import { useToast } from "../overlay";

export function AnalysisPanel({ job }: { job: JobRow }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [analyses, setAnalyses] = useState<AnalysisRow[] | null>(null);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [rows, resume] = await Promise.all([aiService.listAnalysesForJob(user.id, job.id), resumeService.get(user.id)]);
      setAnalyses(rows);
      setHasResume(!!resume && resume.resume_text.trim().length > 0);
    } catch {
      push("error", "Could not load analyses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, job.id, push]);

  useEffect(() => {
    load();
  }, [load]);

  const runAnalysis = async () => {
    if (!user) return;
    setAnalyzing(true);
    try {
      const row = await aiService.analyzeJob(user.id, job);
      setAnalyses((prev) => [row, ...(prev ?? [])]);
      setHasResume(true);
      push("success", "Analysis completed.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Unable to complete the analysis. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonRows count={2} height="h-24" />
      </div>
    );
  }

  const latest = analyses?.[0];
  const history = analyses?.slice(1) ?? [];

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-50 text-signal-600 ring-1 ring-inset ring-signal-200">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-900">{latest ? "Re-run the analysis" : "Analyze this job with AI"}</p>
            <p className="text-xs text-ink-500">Compares the posting against your saved resume and scores the fit.</p>
          </div>
        </div>
        <Button onClick={runAnalysis} loading={analyzing}>
          {!analyzing && <Sparkles className="h-4 w-4" />}
          {analyzing ? "Analyzing…" : latest ? "Re-analyze" : "Analyze with AI"}
        </Button>
      </div>

      {hasResume === false && (
        <div className="anim-fade-up flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-800">
            <span className="font-bold">No resume saved yet.</span> The analysis matches the job description against your resume text.{" "}
            <Link to="/resume" className="font-bold underline decoration-amber-400 underline-offset-2 hover:text-amber-900">
              Add your resume first
            </Link>
            .
          </p>
        </div>
      )}

      {!latest && hasResume !== false && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white/60 px-5 py-10 text-center">
          <p className="font-display text-base font-bold text-ink-800">No analysis yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Run the AI to get a match score, the skills you already cover, the gaps to close, and tailored next steps.
          </p>
        </div>
      )}

      {latest && (
        <div className="anim-fade-up overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
            <div className="flex flex-col items-center gap-2">
              <Gauge value={latest.match_score} />
              <p className="max-w-[150px] text-center text-[11px] font-semibold leading-snug text-ink-400">
                {latest.match_score >= 75 ? "Strong fit — apply with confidence" : latest.match_score >= 50 ? "Decent fit — tailor your resume" : "Stretch role — expect to close gaps"}
              </p>
            </div>

            <div className="space-y-5">
              <section>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-pine-600">
                  Matching skills · {latest.matching_skills.length}
                </h4>
                {latest.matching_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {latest.matching_skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2.5 py-1 text-xs font-semibold text-pine-700 ring-1 ring-inset ring-pine-200">
                        <Check className="h-3 w-3" />
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">No direct keyword overlap found — the posting may use different terminology than your resume.</p>
                )}
              </section>

              <section>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-signal-600">
                  Skills to address · {latest.missing_skills.length}
                </h4>
                {latest.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {latest.missing_skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-signal-50 px-2.5 py-1 text-xs font-semibold text-signal-700 ring-1 ring-inset ring-signal-200">
                        <Minus className="h-3 w-3" />
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">Nothing major missing — your resume covers everything this posting asks for.</p>
                )}
              </section>
            </div>
          </div>

          <div className="border-t border-ink-100 bg-mist-50/70 px-5 py-4 sm:px-6">
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500">Recommended next steps</h4>
            <ol className="space-y-2">
              {latest.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-ink-900 font-display text-[11px] font-bold text-signal-300">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11px] text-ink-400">
              AI-assisted estimate based on keyword and skill overlap — not an objective prediction of hiring outcomes. Analyzed{" "}
              {new Date(latest.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.
            </p>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-500">
            <History className="h-3.5 w-3.5" />
            Earlier analyses
          </h4>
          <ul className="divide-y divide-ink-100/80">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-xs text-ink-500">
                  {new Date(a.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span className={cn("rounded-md px-2 py-0.5 font-display text-xs font-bold tabular-nums text-white")} style={{ backgroundColor: scoreColor(a.match_score) }}>
                  {a.match_score}% match
                </span>
              </li>
            ))}
          </ul>
          <Link to="/resume" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-pine-600 hover:text-pine-700">
            Updated your resume since? Re-analyze to see the score move.
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
