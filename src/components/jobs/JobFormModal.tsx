import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { JOB_STATUSES, type JobRow, type JobStatus } from "../../lib/db";
import { jobsService, type JobInput } from "../../services/jobs";
import { useAuth } from "../../hooks/useAuth";
import { validateJobInput, type JobInputErrors } from "../../utils/validation";
import { Button, Field, Select, TextArea, TextInput } from "../ui";
import { Modal, useToast } from "../overlay";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided, the modal edits this job instead of creating one. */
  job?: JobRow | null;
  onSaved: (job: JobRow) => void;
}

export function JobFormModal({ open, onClose, job, onSaved }: Props) {
  const { user } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState<JobInput>({
    company_name: "",
    job_title: "",
    location: "",
    job_description: "",
    status: "Saved",
  });
  const [errors, setErrors] = useState<JobInputErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      job
        ? {
            company_name: job.company_name,
            job_title: job.job_title,
            location: job.location,
            job_description: job.job_description,
            status: job.status,
          }
        : { company_name: "", job_title: "", location: "", job_description: "", status: "Saved" },
    );
  }, [open, job]);

  const set = (key: keyof JobInput, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const nextErrors = validateJobInput(form);
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    try {
      const saved = job ? await jobsService.update(user.id, job.id, form) : await jobsService.create(user.id, form);
      push("success", job ? "Application updated." : "Application added to your board.");
      onSaved(saved);
      onClose();
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not save the application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={job ? "Edit application" : "New application"} wide>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" error={errors.company_name}>
            {(id) => (
              <TextInput
                id={id}
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                placeholder="e.g. Northwind Labs"
                invalid={!!errors.company_name}
                autoFocus
              />
            )}
          </Field>
          <Field label="Job title" error={errors.job_title}>
            {(id) => (
              <TextInput
                id={id}
                value={form.job_title}
                onChange={(e) => set("job_title", e.target.value)}
                placeholder="e.g. Frontend Developer"
                invalid={!!errors.job_title}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            {(id) => (
              <TextInput id={id} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Berlin · Hybrid" />
            )}
          </Field>
          <Field label="Status">
            {(id) => (
              <Select id={id} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {JOB_STATUSES.map((s: JobStatus) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field
          label="Job description"
          error={errors.job_description}
          hint="Paste the full posting — the AI reads it to score the match and generate interview questions."
        >
          {(id) => (
            <TextArea
              id={id}
              rows={7}
              value={form.job_description}
              onChange={(e) => set("job_description", e.target.value)}
              placeholder={"Requirements:\n- JavaScript, React…"}
              invalid={!!errors.job_description}
            />
          )}
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" />
            {job ? "Save changes" : "Add application"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
