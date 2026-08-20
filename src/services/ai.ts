/**
 * AI service.
 *
 * In the production deployment these three operations call Supabase Edge
 * Functions (which hold the NVIDIA NIM API key server-side). The contract is
 * identical: send job + resume context, receive validated structured JSON.
 * Here a local engine fulfils the contract so the workflow is fully testable.
 */

import { computeAnalysis, computeEvaluation, computeQuestions, type AnalysisResult, type EvaluationResult } from "../lib/aiEngine";
import { dbAnalyses, dbInterviews, dbResumes, type AnalysisRow, type JobRow, type QuestionRow } from "../lib/db";

export type { AnalysisRow, QuestionRow };

const aiDelay = () => new Promise((r) => setTimeout(r, 1100 + Math.random() * 700));

/** Structural validation of the AI payload — never trust model output. */
function validateAnalysis(raw: unknown): AnalysisResult {
  const r = raw as AnalysisResult;
  const ok =
    r &&
    typeof r.match_score === "number" &&
    r.match_score >= 0 &&
    r.match_score <= 100 &&
    Array.isArray(r.matching_skills) &&
    r.matching_skills.every((s) => typeof s === "string") &&
    Array.isArray(r.missing_skills) &&
    r.missing_skills.every((s) => typeof s === "string") &&
    Array.isArray(r.recommendations) &&
    r.recommendations.every((s) => typeof s === "string");
  if (!ok) throw new Error("The AI returned an unexpected result. Please try again.");
  return r;
}

function validateEvaluation(raw: unknown): EvaluationResult {
  const r = raw as EvaluationResult;
  const ok =
    r &&
    typeof r.score === "number" &&
    r.score >= 0 &&
    r.score <= 10 &&
    typeof r.feedback === "string" &&
    Array.isArray(r.strengths) &&
    Array.isArray(r.weaknesses) &&
    Array.isArray(r.suggestions);
  if (!ok) throw new Error("The AI returned an unexpected evaluation. Please try again.");
  return r;
}

export const aiService = {
  async analyzeJob(userId: string, job: JobRow): Promise<AnalysisRow> {
    const resume = await dbResumes.get(userId);
    if (!resume || !resume.resume_text.trim()) {
      throw new Error("Save your resume first — the analysis compares the job description against it.");
    }
    if (job.job_description.trim().length < 40) {
      throw new Error("This job has no usable description. Edit the application and paste the posting first.");
    }
    await aiDelay();
    const raw = computeAnalysis(resume.resume_text, job.job_title, job.job_description);
    const result = validateAnalysis(raw);
    return dbAnalyses.insert({ user_id: userId, job_id: job.id, ...result });
  },

  listAnalysesForJob: (userId: string, jobId: string) => dbAnalyses.listForJob(userId, jobId),
  listAnalyses: (userId: string) => dbAnalyses.listForUser(userId),

  async prepareInterview(userId: string, job: JobRow): Promise<QuestionRow[]> {
    if (job.job_description.trim().length < 40) {
      throw new Error("Add a real job description first — questions are generated from it.");
    }
    await aiDelay();
    const questions = computeQuestions(job.job_title, job.company_name, job.job_description);
    if (questions.length === 0) throw new Error("The AI could not generate questions for this posting. Please try again.");
    const { questions: rows } = await dbInterviews.createSessionWithQuestions(userId, job.id, questions);
    return rows;
  },

  async evaluateAnswer(userId: string, questionRow: QuestionRow, answer: string, job: JobRow): Promise<QuestionRow> {
    if (answer.trim().length < 40) {
      throw new Error("Write a fuller answer (a few sentences) before asking for feedback.");
    }
    await aiDelay();
    const raw = computeEvaluation(questionRow.question, questionRow.category, answer);
    const result = validateEvaluation(raw);
    return dbInterviews.updateQuestion(questionRow.id, { answer: answer.trim(), ...result });
  },
};
