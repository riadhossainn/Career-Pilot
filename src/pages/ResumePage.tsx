import { useEffect, useMemo, useState } from "react";
import { FileText, ListChecks, Save, Sparkles } from "lucide-react";
import type { ResumeRow } from "../lib/db";
import { resumeService } from "../services/resume";
import { extractSkillNames } from "../utils/skills";
import { useAuth } from "../hooks/useAuth";
import { Button, SkeletonRows, TextArea, cn } from "../components/ui";
import { useToast } from "../components/overlay";

const TIPS = [
  "List skills as plain keywords (JavaScript, React, SQL) — the matcher reads exact terms.",
  "Mirror the vocabulary used in the postings you target.",
  "Add numbers: users reached, grades, performance gains, team sizes.",
  "Keep projects to 2–3 lines: what you built, with what, and the result.",
];

export function ResumePage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [resume, setResume] = useState<ResumeRow | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    resumeService
      .get(user.id)
      .then((row) => {
        if (cancelled) return;
        setResume(row);
        setText(row?.resume_text ?? "");
      })
      .catch(() => {
        if (!cancelled) push("error", "Could not load your resume.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, push]);

  const detected = useMemo(() => extractSkillNames(text), [text]);
  const dirty = text !== (resume?.resume_text ?? "");

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const row = await resumeService.save(user.id, text);
      setResume(row);
      push("success", "Resume saved. Future analyses will use this version.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not save your resume.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="skeleton h-[420px] rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="anim-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">Resume profile</h2>
          <p className="mt-1 text-sm text-ink-500">The single source of truth the AI compares every job description against.</p>
        </div>
        {resume && (
          <span className="text-xs font-semibold text-ink-400">
            Last updated {new Date(resume.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Editor */}
        <div className="anim-fade-up d-1 rounded-xl border border-ink-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-500">
              <FileText className="h-3.5 w-3.5" />
              Resume text
            </h3>
            <span className={cn("text-[11px] font-bold", dirty ? "text-amber-600" : "text-ink-300")}>{dirty ? "Unsaved changes" : "Up to date"}</span>
          </div>
          <div className="p-4 sm:p-5">
            <TextArea
              aria-label="Resume text"
              rows={17}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "Paste your resume as plain text…\n\nSKILLS\nJavaScript, React, SQL, Git…\n\nPROJECTS\n- Campus Marketplace — React + Node.js…\n\nEXPERIENCE\n- Web intern at …"
              }
              className="font-[13.5px]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs tabular-nums text-ink-400">{text.trim().length.toLocaleString()} characters</span>
              <Button onClick={save} loading={saving} disabled={!dirty}>
                {!saving && <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save resume"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="anim-fade-up d-2 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
            <h3 className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-500">
              Skills the AI can see
              <span className="rounded-full bg-pine-50 px-2 py-0.5 font-display text-[11px] font-bold text-pine-700 ring-1 ring-inset ring-pine-200">{detected.length}</span>
            </h3>
            <p className="mb-3 text-[11px] leading-relaxed text-ink-400">Detected live from the text on the left — these are matched against job descriptions.</p>
            {detected.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-center text-xs text-ink-400">
                Start typing — recognized skills appear here instantly.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detected.map((s) => (
                  <span key={s} className="anim-fade-in rounded-full bg-pine-50 px-2.5 py-1 text-xs font-semibold text-pine-700 ring-1 ring-inset ring-pine-200">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="anim-fade-up d-3 rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-500">
              <ListChecks className="h-3.5 w-3.5 text-pine-600" />
              Make it matcher-friendly
            </h3>
            <ul className="space-y-2.5">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-600">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="anim-fade-up d-4 rounded-xl border border-pine-200/70 bg-pine-50/60 p-5">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pine-700">
              <Sparkles className="h-3.5 w-3.5" />
              Why this matters
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-pine-700/90">
              Every “Analyze with AI” run compares the posting’s required skills against this text. A sharper resume means sharper match scores and better
              recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
