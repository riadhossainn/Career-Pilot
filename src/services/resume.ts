import { dbResumes, type ResumeRow } from "../lib/db";
import { validateResumeText } from "../utils/validation";

export type { ResumeRow };

export const resumeService = {
  get: (userId: string) => dbResumes.get(userId),

  async save(userId: string, resume_text: string): Promise<ResumeRow> {
    const error = validateResumeText(resume_text);
    if (error) throw new Error(error);
    return dbResumes.upsert(userId, resume_text.trim());
  },
};
