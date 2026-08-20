# CareerPilot — AI Job & Interview Assistant

CareerPilot helps students and job seekers **track job applications**, **analyze job
descriptions against their resume with AI**, and **practice interviews** with
AI-generated questions and AI-assisted answer feedback.

This build is a complete, working MVP. Because it must run as a static site in this
environment, the backend and the AI endpoint are fulfilled by a **local data layer and a
deterministic local AI engine** that implement the *exact same contracts* as the
production stack (Supabase + NVIDIA NIM via Edge Functions). Swapping to the real
backend only changes `src/lib/db.ts` and `src/services/ai.ts` — no UI code changes.

---

## Quick start

```bash
npm install
npm run dev      # local development
npm run build    # production build (dist/)
```

On the login screen, **“Explore the demo account”** seeds a full demo user
(`demo@careerpilot.app` / `career123`) with a resume, 4 applications, a completed AI
analysis and an interview session — or register a fresh account to see every empty
state.

## Feature checklist

| Area | What works |
|---|---|
| Auth | Register, login, logout, 7-day session restore, protected routes |
| Dashboard | Total / active / interview / rejected counts, pipeline distribution, recent applications, preflight checklist |
| Applications | Create, list, search, filter by status, detail view, edit, delete (with confirmation), status pipeline Saved → Applied → Interview → Offer → Rejected |
| Resume | Save/update plain-text resume, live skill detection, updated timestamps |
| AI Analysis | Match score, matching skills, missing skills, recommendations; validated structured result; persisted history per job |
| Interview | ~5 generated questions (question, category, difficulty) saved as a session; answer evaluation returning score 0–10, strengths, weaknesses, suggestions, feedback |
| UX | Loading skeletons, success toasts, friendly errors, empty states, responsive mobile drawer, accessible labels |

## Architecture

```
src/
  lib/
    db.ts          # Data layer. Mirrors Supabase tables + RLS user scoping.
    aiEngine.ts    # Pure AI engine: analysis, question generation, evaluation.
  services/
    auth.ts        # Auth operations (session tokens)
    jobs.ts        # Application CRUD + validation
    resume.ts      # Resume upsert + validation
    ai.ts          # AI workflows: validates AI output before persisting
  hooks/
    useAuth.tsx    # Auth context + provider
  components/
    ui.tsx         # Buttons, fields, status pills, gauges, empty states
    overlay.tsx    # Modal, confirm dialog, toast system
    layout/AppShell.tsx
    jobs/          # JobFormModal, AnalysisPanel
    interview/     # InterviewPanel
  pages/           # AuthPage, Dashboard, Jobs, JobDetails, ResumePage
  utils/
    skills.ts      # Skill taxonomy + text extraction
    validation.ts  # Shared input validators
```

**Data flow (AI analysis):** `JobDetails → AnalysisPanel → aiService.analyzeJob()`
checks that a resume and a usable description exist → the engine computes the
structured result → `validateAnalysis()` rejects malformed payloads → the row is
persisted via `dbAnalyses.insert()` → the panel renders the gauge, skill chips and
recommendations. Interview generation and evaluation follow the same pattern.

**Security model:** every data-layer function takes the authenticated `user_id` and
filters on it — the same guarantee Row Level Security policies
(`user_id = auth.uid()`) enforce in PostgreSQL. UI filtering is never the security
boundary; `dbJobs.get(otherUserId, jobId)` throws “not found”, exactly like RLS would.

## Mapping to the production stack

| This build | Production equivalent |
|---|---|
| `lib/db.ts` (localStorage) | Supabase PostgreSQL client (`@supabase/supabase-js`) with RLS policies on `profiles`, `jobs`, `resumes`, `ai_analyses`, `interview_sessions`, `interview_questions` |
| `dbAuth` + tokens | Supabase Auth (email/password) |
| `services/ai.ts` → `lib/aiEngine.ts` | Supabase Edge Functions calling the NVIDIA NIM OpenAI-compatible chat-completions API; the NVIDIA key lives **only** in `supabase secrets`, never in the browser |
| `validateAnalysis` / `validateEvaluation` | Same validators run on Edge Function output before it reaches React |

## Testing guide

- **Auth:** register → login → logout → open `/#/jobs` while signed out (redirects to login).
- **Jobs:** create with an empty title (inline error), edit, change status via the pipeline, delete (confirm dialog).
- **Authorization:** register a second account — the first account’s applications, analyses and interviews are invisible and unreachable by URL.
- **AI:** run an analysis with no resume saved (friendly error linking to `/resume`); run it with a resume; note the saved history on re-analysis.
- **Interview:** generate questions, submit a one-word answer (validation error), submit a full answer (scored feedback), generate a new set.
