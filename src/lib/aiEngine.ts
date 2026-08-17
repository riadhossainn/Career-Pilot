/**
 * Pure AI engine.
 *
 * In production this logic lives in a Supabase Edge Function that calls the
 * NVIDIA NIM chat-completions API with a strict JSON schema. Here the same
 * contract (structured input -> validated structured output) is fulfilled by a
 * deterministic local engine, so the app is fully functional offline and the
 * frontend integration is identical to the real deployment.
 */

import { extractSkillDefs, type SkillCategory, type SkillDef } from "../utils/skills";

export interface AnalysisResult {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface GeneratedQuestion {
  question: string;
  category: string;
  difficulty: Difficulty;
}

export interface EvaluationResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  feedback: string;
}

/* Deterministic hash so results are stable per job but vary between jobs. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ------------------------------------------------------------------ */
/* Job analysis                                                        */
/* ------------------------------------------------------------------ */

const MISSING_TIPS: Partial<Record<SkillCategory, (skill: string) => string>> = {
  Frontend: (s) =>
    `Close the ${s} gap with one focused weekend project — a small app is enough to speak about it credibly in interviews.`,
  Backend: (s) =>
    `Add a lightweight ${s} exercise (a tiny API or script) to your projects section so the keyword is backed by evidence.`,
  Database: (s) =>
    `Show ${s} hands-on: even a schema diagram plus two or three queries from a coursework project counts.`,
  DevOps: (s) =>
    `Demonstrate ${s} once — containerize or deploy an existing project and mention it in a single resume line.`,
  Testing: (s) =>
    `Write tests with ${s} for one existing project and mention coverage of a critical flow.`,
  "Data & AI": (s) =>
    `Add a small ${s} notebook or report (public dataset, two charts, one insight) to your portfolio.`,
  Mobile: (s) =>
    `Build one tiny ${s} screen that reuses an existing design — enough to discuss trade-offs in interviews.`,
  "Core CS": (s) =>
    `Refresh ${s} and reference where you applied it in coursework or projects, not just the course name.`,
  Design: (s) =>
    `Show ${s} with before/after screenshots from a real project.`,
  Workplace: (s) =>
    `Give one concrete ${s.toLowerCase()} example with a measurable outcome on your resume.`,
};

export function computeAnalysis(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
): AnalysisResult {
  const jobDefs = extractSkillDefs(`${jobTitle} ${jobDescription}`);
  const resumeNames = new Set(extractSkillDefs(resumeText).map((d) => d.name));

  const matchingDefs = jobDefs.filter((d) => resumeNames.has(d.name));
  const missingDefs = jobDefs.filter((d) => !resumeNames.has(d.name));

  const coverage = jobDefs.length > 0 ? matchingDefs.length / jobDefs.length : 0.4;
  const jitter = fnv1a(jobTitle + jobDescription + resumeText) % 7;
  const score =
    jobDefs.length === 0
      ? 52 + jitter
      : clamp(Math.round(coverage * 80 + Math.min(matchingDefs.length, 6) * 2 + 8 + jitter), 32, 97);

  const matching_skills = matchingDefs.map((d) => d.name);
  const missing_skills = missingDefs.map((d) => d.name);

  const recommendations: string[] = [];
  if (matching_skills.length > 0) {
    recommendations.push(
      `Lead your resume with ${matching_skills.slice(0, 3).join(", ")} — this posting emphasizes ${
        matching_skills.length > 3 ? "all of them" : "them"
      } explicitly.`,
    );
  }
  for (const def of missingDefs.slice(0, 2)) {
    const tip = MISSING_TIPS[def.category];
    recommendations.push(
      tip ? tip(def.name) : `Mention any exposure to ${def.name}, even from coursework, or plan a small project around it.`,
    );
  }
  if (jobDefs.length === 0) {
    recommendations.push(
      "The posting contains few recognizable skill keywords — mirror its exact phrasing in your resume to pass screening.",
    );
  } else if (coverage < 0.5 && missingDefs.length > 2) {
    recommendations.push(
      `This role leans on ${missingDefs.slice(0, 3).map((d) => d.name).join(", ")} — consider it a stretch application and tailor a cover letter that addresses the gap honestly.`,
    );
  }
  recommendations.push(
    "Quantify at least two achievements (users, grades, speed-ups, team size) — numbers survive both ATS filters and human skimming.",
  );

  return {
    match_score: score,
    matching_skills,
    missing_skills,
    recommendations: recommendations.slice(0, 4),
  };
}

/* ------------------------------------------------------------------ */
/* Interview questions                                                 */
/* ------------------------------------------------------------------ */

interface BankItem {
  q: string;
  difficulty: Difficulty;
}

const TECH_BANK: Partial<Record<SkillCategory, BankItem[]>> = {
  Frontend: [
    { q: "What is the difference between useState and useEffect in React, and when does each run?", difficulty: "Medium" },
    { q: "How does the virtual DOM improve rendering performance compared to updating the real DOM directly?", difficulty: "Medium" },
    { q: "Explain CSS specificity and how you keep styles maintainable in a large project.", difficulty: "Easy" },
    { q: "A React page renders slowly with a large list. Walk me through how you would diagnose and fix it.", difficulty: "Hard" },
    { q: "What are semantic HTML elements and why do they matter for accessibility and SEO?", difficulty: "Easy" },
    { q: "Explain what TypeScript adds over JavaScript. When has it actually saved you from a bug?", difficulty: "Medium" },
  ],
  Backend: [
    { q: "Explain the difference between SQL and NoSQL databases. When would you choose each?", difficulty: "Medium" },
    { q: "How does token-based authentication (JWT) work, and how is it different from session cookies?", difficulty: "Hard" },
    { q: "What happens step by step when you type a URL into a browser and press Enter?", difficulty: "Easy" },
    { q: "How would you design a simple rate limiter for a public REST API?", difficulty: "Hard" },
    { q: "Explain the Node.js event loop in your own words. Why is blocking the event loop dangerous?", difficulty: "Hard" },
    { q: "What makes a REST API well-designed? Give concrete examples from one you have used or built.", difficulty: "Medium" },
  ],
  Database: [
    { q: "What is a database index, how does it speed up queries, and what does it cost?", difficulty: "Medium" },
    { q: "Explain the ACID properties with a real example, like a money transfer.", difficulty: "Medium" },
    { q: "How would you model a many-to-many relationship, for example students and courses?", difficulty: "Easy" },
  ],
  DevOps: [
    { q: "What is CI/CD and why do teams invest in it? Describe a pipeline you would set up for a student project.", difficulty: "Easy" },
    { q: "Explain what a Docker container is and how it differs from a virtual machine.", difficulty: "Medium" },
    { q: "Walk me through how you would deploy a full-stack web app to the cloud at a high level.", difficulty: "Medium" },
  ],
  "Data & AI": [
    { q: "Walk me through how you would clean and explore a messy real-world dataset.", difficulty: "Medium" },
    { q: "What is overfitting in machine learning, and how do you detect and prevent it?", difficulty: "Medium" },
  ],
  Mobile: [
    { q: "Compare React Native and Flutter. Which would you pick for a small team and why?", difficulty: "Medium" },
  ],
  Testing: [
    { q: "Why write unit tests? Describe a bug a test could have caught in one of your projects.", difficulty: "Easy" },
    { q: "What makes a test good rather than just present? Talk about readability, isolation, and assertions.", difficulty: "Medium" },
  ],
  "Core CS": [
    { q: "Explain Big-O notation using a concrete example from code you have written.", difficulty: "Medium" },
    { q: "How does a hash map work under the hood, and what happens on collisions?", difficulty: "Hard" },
  ],
  Design: [
    { q: "How do you turn a Figma design into responsive, accessible code? Where do designers and developers usually clash?", difficulty: "Easy" },
  ],
  Workplace: [
    { q: "Tell me about a time you disagreed with a teammate. How did you handle it?", difficulty: "Medium" },
  ],
};

const BEHAVIORAL: BankItem[] = [
  { q: "Tell me about the project you are most proud of. What was your specific contribution?", difficulty: "Easy" },
  { q: "Describe a time you were stuck on a hard bug. What was your debugging process?", difficulty: "Medium" },
  { q: "Tell me about a time you had to learn something completely new under a deadline.", difficulty: "Medium" },
  { q: "Describe a situation where you received difficult feedback. What did you change afterwards?", difficulty: "Medium" },
];

export function computeQuestions(
  jobTitle: string,
  companyName: string,
  jobDescription: string,
): GeneratedQuestion[] {
  const seed = fnv1a(companyName + jobTitle + jobDescription);
  const cats: SkillCategory[] = [];
  for (const def of extractSkillDefs(`${jobTitle} ${jobDescription}`)) {
    if (!cats.includes(def.category)) cats.push(def.category);
  }

  const picked: GeneratedQuestion[] = [];
  const usedQuestions = new Set<string>();

  const takeFrom = (cat: SkillCategory) => {
    const bank = TECH_BANK[cat];
    if (!bank) return;
    const item = bank[(seed + picked.length) % bank.length];
    if (!usedQuestions.has(item.q)) {
      usedQuestions.add(item.q);
      picked.push({ question: item.q, category: cat, difficulty: item.difficulty });
    }
  };

  // Two technical questions from the strongest categories of the posting.
  for (const cat of cats.slice(0, 2)) takeFrom(cat);
  // One role-fit question grounded in the actual company and title.
  picked.push({
    question: `What interests you most about this ${jobTitle} position at ${companyName}, and how does your background prepare you for it?`,
    category: "Role fit",
    difficulty: "Easy",
  });
  // Fill from remaining categories, then behavioral.
  for (const cat of cats.slice(2)) {
    if (picked.length >= 5) break;
    takeFrom(cat);
  }
  for (let i = 0; picked.length < 5; i++) {
    const item = BEHAVIORAL[(seed + i) % BEHAVIORAL.length];
    if (usedQuestions.has(item.q)) continue;
    usedQuestions.add(item.q);
    picked.push({ question: item.q, category: "Behavioral", difficulty: item.difficulty });
    if (i > 8) break;
  }

  // Guarantee at least one hard question.
  if (!picked.some((q) => q.difficulty === "Hard") && picked.length > 0) {
    const hardCat = cats.find((c) => TECH_BANK[c]?.some((b) => b.difficulty === "Hard"));
    if (hardCat) {
      const item = TECH_BANK[hardCat]!.find((b) => b.difficulty === "Hard")!;
      picked[picked.length - 1] = { question: item.q, category: hardCat, difficulty: "Hard" };
    }
  }

  return picked.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Answer evaluation                                                   */
/* ------------------------------------------------------------------ */

export function computeEvaluation(question: string, category: string, answer: string): EvaluationResult {
  const text = answer.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const n = words.length;
  const lower = text.toLowerCase();

  const keywords = Array.from(
    new Set(
      `${question} ${category}`
        .toLowerCase()
        .replace(/[^a-z0-9+#./ ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4),
    ),
  );
  const hits = keywords.filter((k) => lower.includes(k)).length;
  const keywordRatio = keywords.length > 0 ? hits / keywords.length : 0;

  const hasExample = /for example|for instance|in my|my project|i built|i worked|i made|during my|at university|in a course|internship/.test(lower);
  const hasStructure = /because|so that|however|first|then|finally|trade-?off|step by step|on the other hand/.test(lower);
  const hasQuant = /\d/.test(text);
  const isVague = /maybe|i guess|not sure|kind of|sort of|i don'?t know/.test(lower);

  let score = 2;
  score += Math.min(2.6, (n / 45) * 2.6); // substance
  score += Math.min(2.4, keywordRatio * 3); // relevance to the question
  if (hasExample) score += 1.1;
  if (hasStructure) score += 0.8;
  if (hasQuant) score += 0.5;
  if (isVague) score -= 1.2;
  score = clamp(Math.round(score), 1, 10);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (keywordRatio >= 0.35) strengths.push(`Stays on topic — you address the core concepts the question asks about (${Math.round(keywordRatio * 100)}% keyword coverage).`);
  if (hasExample) strengths.push("Grounds the answer in a concrete example from your own experience, which interviewers reward.");
  if (hasStructure) strengths.push("Uses a clear structure (cause/effect or steps), which makes the answer easy to follow.");
  if (hasQuant) strengths.push("Includes numbers, which makes claims more credible.");
  if (n >= 60) strengths.push("Develops the idea with enough depth rather than a one-line reply.");

  if (n < 30) weaknesses.push("Very brief — an interviewer would have to pull details out of you.");
  if (keywordRatio < 0.2) weaknesses.push("Drifts away from what the question specifically asks; key terms from the prompt are missing.");
  if (!hasExample) weaknesses.push("No concrete example — the answer stays theoretical.");
  if (isVague) weaknesses.push("Hedging phrases (\u201cmaybe\u201d, \u201cI guess\u201d) weaken your credibility.");
  if (!hasQuant) weaknesses.push("No measurable detail (sizes, durations, results) to anchor your claims.");
  if (strengths.length === 0) strengths.push("You made a start — there is a clear base to build on.");
  if (weaknesses.length === 0) weaknesses.push("Little to flag — the main room for growth is adding one deeper technical detail.");

  if (n < 45) suggestions.push("Aim for 3\u20135 sentences: definition, why it matters, then your concrete example.");
  if (!hasExample) suggestions.push("Attach one real example: a project, coursework, or bug where this concept mattered.");
  if (keywordRatio < 0.35) suggestions.push("Mirror the vocabulary of the question itself — interviewers listen for those terms.");
  if (!hasQuant) suggestions.push("Add one number: how many users, how long it took, how much faster it became.");
  suggestions.push("End with a one-line takeaway that links the concept back to the role you are interviewing for.");

  const openers = [
    `A ${score >= 7 ? "solid" : score >= 4 ? "developing" : "very early"} answer.`,
    `Overall this reads as ${score >= 7 ? "interview-ready with polish" : score >= 4 ? "a good draft that needs specifics" : "a starting point that needs structure"}.`,
  ];
  const feedback = `${openers[fnv1a(question + text) % 2]} ${
    score >= 7
      ? "You demonstrate real understanding; tighten the opening sentence and you could deliver this as-is."
      : score >= 4
        ? "The understanding is there, but the answer would land much harder with a concrete example and one measurable detail."
        : "Focus first on directly answering the literal question in one sentence, then expand with an example."
  } Remember this is AI-assisted practice feedback, not an objective grade.`;

  return {
    score,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    suggestions: suggestions.slice(0, 3),
    feedback,
  };
}
