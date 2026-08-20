import { dbJobs, type JobRow, type JobStatus } from "../lib/db";
import { validateJobInput } from "../utils/validation";

export type { JobRow, JobStatus };

export interface JobInput {
  company_name: string;
  job_title: string;
  location: string;
  job_description: string;
  status: JobStatus;
}

function assertValid(input: JobInput) {
  const errors = validateJobInput(input);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
}

export const jobsService = {
  list: (userId: string) => dbJobs.list(userId),
  get: (userId: string, jobId: string) => dbJobs.get(userId, jobId),

  async create(userId: string, input: JobInput): Promise<JobRow> {
    assertValid(input);
    return dbJobs.create(userId, {
      ...input,
      company_name: input.company_name.trim(),
      job_title: input.job_title.trim(),
      location: input.location.trim(),
      job_description: input.job_description.trim(),
    });
  },

  async update(userId: string, jobId: string, patch: Partial<JobInput>): Promise<JobRow> {
    if (patch.company_name !== undefined || patch.job_title !== undefined || patch.job_description !== undefined) {
      const merged = {
        company_name: patch.company_name ?? "x",
        job_title: patch.job_title ?? "x",
        job_description: patch.job_description ?? "x".repeat(40),
      };
      const errors = validateJobInput(merged);
      if (patch.company_name !== undefined && errors.company_name) throw new Error(errors.company_name);
      if (patch.job_title !== undefined && errors.job_title) throw new Error(errors.job_title);
      if (patch.job_description !== undefined && errors.job_description) throw new Error(errors.job_description);
    }
    return dbJobs.update(userId, jobId, patch);
  },

  remove: (userId: string, jobId: string) => dbJobs.remove(userId, jobId),
};
