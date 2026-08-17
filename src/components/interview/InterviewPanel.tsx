import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Lightbulb, MessageSquare, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { dbInterviews } from "../../lib/db";
import type { JobRow, QuestionRow } from "../../lib/db";
import { aiService } from "../../services/ai";
import { validateAnswer } from "../../utils/validation";
import { useAuth } from "../../hooks/useAuth";
import { Button, CategoryChip, DifficultyChip, ScoreChip, SkeletonRows, TextArea, cn } from "../ui";
import { useToast } from "../overlay";

export function InterviewPanel({ job }: { job: JobRow }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sessions = await dbInterviews.listSessions(user.id, job.id);
      setSessionCount(sessions.length);
      if (sessions.length > 0) {
        const rows = await dbInterviews.listQuestions(sessions[0].id);
        setQuestions(rows);
        const firstUnanswered = rows.find((q) => q.score === null);
        setExpandedId(firstUnanswered?.id ?? rows[0]?.id ?? null);
      } else {
        setQuestions(null);
      }
    } catch {
      push("error", "Could not load the interview session.");
    } finally {
      setLoading(false);
    }
  }, [user, job.id, push]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const rows = await aiService.prepareInterview(user.id, job);
      setQuestions(rows);
      setSessionCount((c) => c + 1);
      setExpandedId(rows[0]?.id ?? null);
      setDrafts({});
      setDraftErrors({});
      push("success", "Interview questions generated.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Unable to generate questions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const evaluate = async (q: QuestionRow) => {
    if (!user) return;
    const answer = drafts[q.id] ?? "";
    const error = validateAnswer(answer);
    if (error) {
      setDraftErrors((e) => ({ ...e, [q.id]: error }));
      return;
    }
    setEvaluatingId(q.id);
    try {
      const updated = await aiService.evaluateAnswer(user.id, q, answer, job);
      setQuestions((prev) => (prev ? prev.map((x) => (x.id === q.id ? updated : x)) : prev));
      setDraftErrors((e) => ({ ...e, [q.id]: null }));
      push("success", "Feedback ready.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Unable to evaluate the answer. Please try again.");
    } finally {
      setEvaluatingId(null);
    }
  };

  if (loading) return <SkeletonRows count={3} height="h-16" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-50 text-pine-600 ring-1 ring-inset ring-pine-200">
            <MessageSquare className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-900">
              {questions ? `Practice set · ${questions.filter((q) => q.score !== null).length}/${questions.length} answered` : "Prepare for the interview"}
            </p>
            <p className="text-xs text-ink-500">
              {questions
                ? sessionCount > 1
                  ? `Set #${sessionCount} — generated from the job description. ${sessionCount - 1} earlier set(s) kept in history.`
                  : "Generated from the job title, description and required skills."
                : "The AI builds ~5 questions tailored to this posting — technical, role-fit and behavioral."}
            </p>
          </div>
        </div>
        <Button variant={questions ? "outline" : "primary"} onClick={generate} loading={generating}>
          {!generating && (questions ? <RotateCcw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />)}
          {generating ? "Generating…" : questions ? "New question set" : "Prepare for Interview"}
        </Button>
      </div>

      {!questions && (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white/60 px-5 py-10 text-center">
          <p className="font-display text-base font-bold text-ink-800">No practice session yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Generate a question set for <span className="font-semibold text-ink-700">{job.job_title}</span> at{" "}
            <span className="font-semibold text-ink-700">{job.company_name}</span>, then answer each question for AI-assisted feedback.
          </p>
        </div>
      )}

      {questions?.map((q, index) => {
        const expanded = expandedId === q.id;
        const answered = q.score !== null;
        return (
          <div key={q.id} className={cn("anim-fade-up overflow-hidden rounded-xl border bg-white shadow-sm transition-colors", expanded ? "border-pine-200" : "border-ink-100")}>
            <button
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-mist-50"
              onClick={() => setExpandedId(expanded ? null : q.id)}
              aria-expanded={expanded}
            >
              <span className="font-display text-xs font-bold text-ink-300">Q{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">{q.question}</span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <CategoryChip label={q.category} />
                <DifficultyChip level={q.difficulty} />
                {answered && <ScoreChip score={q.score!} />}
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200", expanded && "rotate-180")} />
            </button>

            {expanded && (
              <div className="anim-fade-in border-t border-ink-100 px-4 py-4">
                <div className="mb-3 flex items-center gap-1.5 sm:hidden">
                  <CategoryChip label={q.category} />
                  <DifficultyChip level={q.difficulty} />
                  {answered && <ScoreChip score={q.score!} />}
                </div>

                {answered ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-mist-100/80 px-3.5 py-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-400">Your answer</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{q.answer}</p>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-ink-100 bg-white px-3.5 py-3">
                      <span className="mt-0.5 text-pine-600">
                        <TrendingUp className="h-4.5 w-4.5" />
                      </span>
                      <p className="text-sm italic leading-relaxed text-ink-700">“{q.feedback}”</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-emerald-50/70 px-3.5 py-3 ring-1 ring-inset ring-emerald-200/70">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Strengths</p>
                        <ul className="space-y-1.5">
                          {q.strengths?.map((s, i) => (
                            <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-emerald-900">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg bg-amber-50/70 px-3.5 py-3 ring-1 ring-inset ring-amber-200/70">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-700">Weaknesses</p>
                        <ul className="space-y-1.5">
                          {q.weaknesses?.map((s, i) => (
                            <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-amber-900">
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg bg-pine-50/70 px-3.5 py-3 ring-1 ring-inset ring-pine-200/70">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-pine-700">Try this</p>
                        <ul className="space-y-1.5">
                          {q.suggestions?.map((s, i) => (
                            <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-pine-900">
                              <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-pine-600" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="text-[11px] text-ink-400">AI-assisted practice feedback — treat it as a coaching hint, not an objective grade.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <TextArea
                      rows={5}
                      placeholder="Answer as if you were in the interview — definition, why it matters, and a concrete example from your work…"
                      value={drafts[q.id] ?? ""}
                      invalid={!!draftErrors[q.id]}
                      onChange={(e) => {
                        setDrafts((d) => ({ ...d, [q.id]: e.target.value }));
                        setDraftErrors((er) => ({ ...er, [q.id]: null }));
                      }}
                    />
                    {draftErrors[q.id] && (
                      <p role="alert" className="text-xs font-medium text-rose-600">
                        {draftErrors[q.id]}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button onClick={() => evaluate(q)} loading={evaluatingId === q.id} variant="dark">
                        {evaluatingId === q.id ? "Evaluating…" : "Evaluate answer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
