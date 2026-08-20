/** Small shared validators. Each returns an error message or null. */

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required.";
  if (pw.length < 6) return "Password must be at least 6 characters.";
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "Your name is required.";
  if (name.trim().length < 2) return "Name looks too short.";
  return null;
}

export interface JobInputErrors {
  company_name?: string;
  job_title?: string;
  job_description?: string;
}

export function validateJobInput(input: { company_name: string; job_title: string; job_description: string }): JobInputErrors {
  const errors: JobInputErrors = {};
  if (!input.company_name.trim()) errors.company_name = "Company name is required.";
  if (!input.job_title.trim()) errors.job_title = "Job title is required.";
  if (!input.job_description.trim()) {
    errors.job_description = "Paste the job description — the AI needs it to analyze the role.";
  } else if (input.job_description.trim().length < 40) {
    errors.job_description = "Description looks too short (min 40 characters) for a meaningful analysis.";
  }
  return errors;
}

export function validateResumeText(text: string): string | null {
  if (!text.trim()) return "Paste or type your resume text before saving.";
  if (text.trim().length < 80) return "Add a bit more detail — skills, projects, or experience (min 80 characters).";
  return null;
}

export function validateAnswer(text: string): string | null {
  if (!text.trim()) return "Write your answer first.";
  if (text.trim().length < 40) return "Give a fuller answer — at least a few sentences — so the feedback is useful.";
  return null;
}
