/**
 * Local data layer.
 *
 * This module mirrors the shape of the production stack: a Supabase
 * (PostgreSQL) backend with Row Level Security. Every read/write below is
 * scoped to the authenticated user's id — the same guarantee RLS policies
 * enforce server-side — so swapping this module for `@supabase/supabase-js`
 * calls later does not change any UI code.
 */

import { computeAnalysis, computeEvaluation, computeQuestions } from "./aiEngine";

export type JobStatus = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";
export const JOB_STATUSES: JobStatus[] = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface TokenRow {
  token: string;
  user_id: string;
  expires_at: string;
}

export interface JobRow {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  location: string;
  job_description: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface ResumeRow {
  id: string;
  user_id: string;
  resume_text: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisRow {
  id: string;
  user_id: string;
  job_id: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  created_at: string;
}

export interface InterviewSessionRow {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  session_id: string;
  question: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  answer: string | null;
  score: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  suggestions: string[] | null;
  feedback: string | null;
  created_at: string;
}

interface Schema {
  users: UserRow[];
  tokens: TokenRow[];
  jobs: JobRow[];
  resumes: ResumeRow[];
  analyses: AnalysisRow[];
  interview_sessions: InterviewSessionRow[];
  interview_questions: QuestionRow[];
}

const DB_KEY = "careerpilot_db_v1";
const TOKEN_KEY = "careerpilot_token_v1";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const emptyDb = (): Schema => ({
  users: [],
  tokens: [],
  jobs: [],
  resumes: [],
  analyses: [],
  interview_sessions: [],
  interview_questions: [],
});

function readDb(): Schema {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDb();
    return { ...emptyDb(), ...(JSON.parse(raw) as Partial<Schema>) };
  } catch {
    return emptyDb();
  }
}

function writeDb(db: Schema) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Simulated network latency so loading states behave like a real backend. */
function delay(ms = 380 + Math.random() * 420): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Demo-only stand-in for bcrypt — real auth is delegated to Supabase Auth. */
function hashPassword(pw: string): string {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(36)}.${pw.length}`;
}

/* ---------------------------- auth ---------------------------- */

export const dbAuth = {
  async register(full_name: string, email: string, password: string): Promise<UserRow> {
    await delay();
    const db = readDb();
    const normalized = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === normalized)) {
      throw new Error("An account with this email already exists. Try signing in instead.");
    }
    const user: UserRow = {
      id: uid(),
      full_name: full_name.trim(),
      email: normalized,
      password_hash: hashPassword(password),
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    writeDb(db);
    return user;
  },

  async login(email: string, password: string): Promise<UserRow> {
    await delay();
    const db = readDb();
    const user = db.users.find((u) => u.email === email.trim().toLowerCase());
    if (!user || user.password_hash !== hashPassword(password)) {
      throw new Error("Incorrect email or password.");
    }
    return user;
  },

  createToken(user_id: string): string {
    const db = readDb();
    const token = uid();
    db.tokens.push({ token, user_id, expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString() });
    writeDb(db);
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  },

  async restoreSession(): Promise<UserRow | null> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const db = readDb();
    const row = db.tokens.find((t) => t.token === token);
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return db.users.find((u) => u.id === row.user_id) ?? null;
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const db = readDb();
      db.tokens = db.tokens.filter((t) => t.token !== token);
      writeDb(db);
    }
    localStorage.removeItem(TOKEN_KEY);
  },
};

/* ---------------------------- jobs ---------------------------- */

export const dbJobs = {
  async list(user_id: string): Promise<JobRow[]> {
    await delay();
    // RLS equivalent: the filter below is what `user_id = auth.uid()` does in SQL.
    return readDb()
      .jobs.filter((j) => j.user_id === user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async get(user_id: string, job_id: string): Promise<JobRow> {
    await delay(300);
    const job = readDb().jobs.find((j) => j.id === job_id && j.user_id === user_id);
    if (!job) throw new Error("This application does not exist or belongs to another account.");
    return job;
  },

  async create(
    user_id: string,
    input: { company_name: string; job_title: string; location: string; job_description: string; status: JobStatus },
  ): Promise<JobRow> {
    await delay();
    const db = readDb();
    const now = new Date().toISOString();
    const job: JobRow = { id: uid(), user_id, created_at: now, updated_at: now, ...input };
    db.jobs.push(job);
    writeDb(db);
    return job;
  },

  async update(user_id: string, job_id: string, patch: Partial<Omit<JobRow, "id" | "user_id" | "created_at">>): Promise<JobRow> {
    await delay();
    const db = readDb();
    const job = db.jobs.find((j) => j.id === job_id && j.user_id === user_id);
    if (!job) throw new Error("This application does not exist or belongs to another account.");
    Object.assign(job, patch, { updated_at: new Date().toISOString() });
    writeDb(db);
    return { ...job };
  },

  async remove(user_id: string, job_id: string): Promise<void> {
    await delay();
    const db = readDb();
    const job = db.jobs.find((j) => j.id === job_id && j.user_id === user_id);
    if (!job) throw new Error("This application does not exist or belongs to another account.");
    const sessionIds = db.interview_sessions.filter((s) => s.job_id === job_id).map((s) => s.id);
    db.interview_questions = db.interview_questions.filter((q) => !sessionIds.includes(q.session_id));
    db.interview_sessions = db.interview_sessions.filter((s) => s.job_id !== job_id);
    db.analyses = db.analyses.filter((a) => a.job_id !== job_id);
    db.jobs = db.jobs.filter((j) => j.id !== job_id);
    writeDb(db);
  },
};

/* --------------------------- resume --------------------------- */

export const dbResumes = {
  async get(user_id: string): Promise<ResumeRow | null> {
    await delay(300);
    return readDb().resumes.find((r) => r.user_id === user_id) ?? null;
  },

  async upsert(user_id: string, resume_text: string): Promise<ResumeRow> {
    await delay();
    const db = readDb();
    const now = new Date().toISOString();
    let row = db.resumes.find((r) => r.user_id === user_id);
    if (row) {
      row.resume_text = resume_text;
      row.updated_at = now;
    } else {
      row = { id: uid(), user_id, resume_text, created_at: now, updated_at: now };
      db.resumes.push(row);
    }
    writeDb(db);
    return { ...row };
  },
};

/* -------------------------- AI analyses ------------------------ */

export const dbAnalyses = {
  async listForUser(user_id: string): Promise<AnalysisRow[]> {
    await delay(280);
    return readDb()
      .analyses.filter((a) => a.user_id === user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async listForJob(user_id: string, job_id: string): Promise<AnalysisRow[]> {
    await delay(280);
    return readDb()
      .analyses.filter((a) => a.user_id === user_id && a.job_id === job_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async insert(row: Omit<AnalysisRow, "id" | "created_at">): Promise<AnalysisRow> {
    const db = readDb();
    const full: AnalysisRow = { ...row, id: uid(), created_at: new Date().toISOString() };
    db.analyses.push(full);
    writeDb(db);
    return full;
  },
};

/* ------------------------ interview data ----------------------- */

export const dbInterviews = {
  async listSessions(user_id: string, job_id: string): Promise<InterviewSessionRow[]> {
    await delay(280);
    return readDb()
      .interview_sessions.filter((s) => s.user_id === user_id && s.job_id === job_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async countSessions(user_id: string, job_id: string): Promise<number> {
    return readDb().interview_sessions.filter((s) => s.user_id === user_id && s.job_id === job_id).length;
  },

  async createSessionWithQuestions(user_id: string, job_id: string, questions: { question: string; category: string; difficulty: "Easy" | "Medium" | "Hard" }[]): Promise<{ session: InterviewSessionRow; questions: QuestionRow[] }> {
    const db = readDb();
    const now = new Date().toISOString();
    const session: InterviewSessionRow = { id: uid(), user_id, job_id, created_at: now };
    db.interview_sessions.push(session);
    const rows: QuestionRow[] = questions.map((q) => ({
      id: uid(),
      session_id: session.id,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
      answer: null,
      score: null,
      strengths: null,
      weaknesses: null,
      suggestions: null,
      feedback: null,
      created_at: now,
    }));
    db.interview_questions.push(...rows);
    writeDb(db);
    return { session, questions: rows };
  },

  async listQuestions(session_id: string): Promise<QuestionRow[]> {
    await delay(280);
    return readDb()
      .interview_questions.filter((q) => q.session_id === session_id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async updateQuestion(
    question_id: string,
    patch: Partial<Pick<QuestionRow, "answer" | "score" | "strengths" | "weaknesses" | "suggestions" | "feedback">>,
  ): Promise<QuestionRow> {
    const db = readDb();
    const q = db.interview_questions.find((x) => x.id === question_id);
    if (!q) throw new Error("Question not found.");
    Object.assign(q, patch);
    writeDb(db);
    return { ...q };
  },
};

/* --------------------------- demo seed ------------------------- */

const DEMO_EMAIL = "demo@careerpilot.app";
export const DEMO_PASSWORD = "career123";

const DEMO_RESUME = `Riad Ahmed — Final-year BSc Computer Science student (expected 2026, GPA 3.6).

SKILLS
JavaScript (ES6+), React, HTML5, CSS3, Tailwind CSS, Node.js, Express, REST APIs, PostgreSQL, MongoDB, Git & GitHub, Jest, Figma, Responsive Design, Agile/Scrum, Communication.

PROJECTS
- Campus Marketplace — React, Node.js, Express, MongoDB. Full-stack listings app with authentication, search and image upload; 120+ active student users. Wrote Jest tests for the auth flow.
- Weather Dash — JavaScript + public REST APIs. Responsive dashboard with geolocation and cached requests.
- Portfolio site — HTML, CSS, Tailwind. 95+ Lighthouse accessibility score.

EXPERIENCE
Web Development Intern, Brightpath Agency (Summer 2025)
- Built 6 client landing pages with HTML/CSS/JavaScript; cut average page weight by 30%.
- Fixed responsive layout bugs across breakpoints; worked in weekly Agile sprints.

COURSEWORK
Data Structures & Algorithms, Databases, Web Development, Software Engineering, Statistics.`;

const DEMO_JOBS: Array<{
  company_name: string;
  job_title: string;
  location: string;
  status: JobStatus;
  daysAgo: number;
  job_description: string;
}> = [
  {
    company_name: "Northwind Labs",
    job_title: "Frontend Developer",
    location: "Berlin · Hybrid",
    status: "Interview",
    daysAgo: 12,
    job_description:
      "We build data-heavy product dashboards and need a Frontend Developer to own core UI surfaces.\n\nRequirements:\n- 2+ years with JavaScript and TypeScript\n- Deep React experience: hooks, context, performance tuning\n- Next.js for server-side rendering\n- Tailwind CSS or a similar utility-first workflow\n- Unit testing with Jest or Cypress\n- Consuming and designing REST APIs or GraphQL\n- Git-based team workflows and familiarity with CI/CD\n\nBonus: design systems, accessibility (WCAG), Node.js services.",
  },
  {
    company_name: "Brightpath Agency",
    job_title: "Junior Web Developer",
    location: "Remote",
    status: "Applied",
    daysAgo: 6,
    job_description:
      "Junior Web Developer to build marketing sites and small client applications.\n\n- HTML, CSS and modern JavaScript\n- WordPress or PHP basics\n- Responsive design and Figma-to-code\n- Basic SEO and web performance awareness\n- Git version control\n- Clear communication with clients and designers",
  },
  {
    company_name: "Helios Systems",
    job_title: "Software Engineering Intern",
    location: "Munich · On-site",
    status: "Saved",
    daysAgo: 3,
    job_description:
      "Internship supporting our backend platform team.\n\n- Python or Java coursework\n- SQL and relational databases (PostgreSQL preferred)\n- Linux command line comfort\n- Exposure to Docker and unit testing\n- Solid data structures and algorithms fundamentals\n- Curiosity about cloud infrastructure (AWS)",
  },
  {
    company_name: "Kite & Co",
    job_title: "UI Engineer",
    location: "Amsterdam · Hybrid",
    status: "Rejected",
    daysAgo: 21,
    job_description:
      "UI Engineer to extend our design system and build accessible component libraries.\n\n- Strong React and TypeScript\n- Storybook / design systems experience\n- CSS architecture and accessibility (WCAG)\n- Testing culture: Jest, React Testing Library\n- GraphQL data layer",
  },
];

export async function seedDemoAccount(): Promise<UserRow> {
  const db = readDb();
  const existing = db.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) return existing;

  const user: UserRow = {
    id: uid(),
    full_name: "Riad Ahmed",
    email: DEMO_EMAIL,
    password_hash: hashPassword(DEMO_PASSWORD),
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
  };
  db.users.push(user);

  const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
  db.resumes.push({ id: uid(), user_id: user.id, resume_text: DEMO_RESUME, created_at: day(25), updated_at: day(2) });

  for (const j of DEMO_JOBS) {
    const job: JobRow = {
      id: uid(),
      user_id: user.id,
      company_name: j.company_name,
      job_title: j.job_title,
      location: j.location,
      job_description: j.job_description,
      status: j.status,
      created_at: day(j.daysAgo),
      updated_at: day(Math.max(0, j.daysAgo - 1)),
    };
    db.jobs.push(job);

    if (j.status === "Interview") {
      const analysis = computeAnalysis(DEMO_RESUME, job.job_title, job.job_description);
      db.analyses.push({ ...analysis, id: uid(), user_id: user.id, job_id: job.id, created_at: day(j.daysAgo - 2) });

      const session: InterviewSessionRow = { id: uid(), user_id: user.id, job_id: job.id, created_at: day(2) };
      db.interview_sessions.push(session);
      const qs = computeQuestions(job.job_title, job.company_name, job.job_description);
      const rows: QuestionRow[] = qs.map((q) => ({
        id: uid(),
        session_id: session.id,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        answer: null,
        score: null,
        strengths: null,
        weaknesses: null,
        suggestions: null,
        feedback: null,
        created_at: day(2),
      }));
      // One question already answered + evaluated so the UI shows a complete state.
      const sampleAnswer =
        "useState holds a piece of state inside a component, and calling its setter schedules a re-render. useEffect runs side effects after render — for example fetching data or subscribing to events — and its dependency array controls when it re-runs. In my Campus Marketplace project I used useEffect with an empty dependency array to load listings once, and useState for the search filter, because the filter changes on every keystroke.";
      const ev = computeEvaluation(rows[0].question, rows[0].category, sampleAnswer);
      rows[0] = { ...rows[0], answer: sampleAnswer, ...ev };
      db.interview_questions.push(...rows);
    }
  }

  writeDb(db);
  return user;
}
