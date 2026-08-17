import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ListChecks, MessagesSquare, PlaneTakeoff, Sparkles, Target } from "lucide-react";
import { dbAuth, seedDemoAccount } from "../lib/db";
import { useAuth } from "../hooks/useAuth";
import { validateEmail, validateName, validatePassword } from "../utils/validation";
import { Button, Field, TextInput } from "../components/ui";
import { useToast } from "../components/overlay";

const FEATURES = [
  { icon: Target, title: "Match scoring", body: "Every posting is scored against your resume — matching skills, gaps, next steps." },
  { icon: ListChecks, title: "Application radar", body: "Track Saved → Applied → Interview → Offer in one board." },
  { icon: MessagesSquare, title: "Interview copilot", body: "Tailored questions per job, with coached feedback on your answers." },
];

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const { user, signIn, signUp, adoptUser } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: null }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string | null> = {
      email: validateEmail(form.email),
      password: isLogin ? (form.password ? null : "Password is required.") : validatePassword(form.password),
    };
    if (!isLogin) next.name = validateName(form.name);
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(form.email, form.password);
        push("success", "Welcome back. Cleared for takeoff.");
      } else {
        await signUp(form.name, form.email, form.password);
        push("success", "Account created — welcome aboard!");
      }
      navigate("/");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const demoUser = await seedDemoAccount();
      dbAuth.createToken(demoUser.id);
      adoptUser({ id: demoUser.id, full_name: demoUser.full_name, email: demoUser.email, created_at: demoUser.created_at });
      push("success", "Demo account loaded — explore the full workflow.");
      navigate("/");
    } catch {
      push("error", "Could not load the demo account.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Cockpit panel */}
      <div className="bg-grid-dark relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(560px 380px at 82% 18%, rgba(244,88,28,0.14), transparent 65%), radial-gradient(640px 460px at 8% 88%, rgba(14,124,123,0.16), transparent 65%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-600 shadow-lg shadow-signal-600/40">
            <PlaneTakeoff className="h-5 w-5 text-white" />
          </span>
          <span>
            <span className="block font-display text-lg font-bold leading-tight text-white">CareerPilot</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">AI career copilot</span>
          </span>
        </div>

        <div className="relative max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-signal-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI job &amp; interview assistant
          </p>
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.06] tracking-tight text-mist-50">
            Fly your job search
            <br />
            like a <span className="text-signal-400">flight plan</span>.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-300">
            Track every application, score each posting against your resume, and rehearse interviews with questions built from the job description itself.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-signal-400">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-mist-100">{title}</span>
                  <span className="block text-[13px] leading-relaxed text-ink-400">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Radar */}
        <div className="relative flex items-end justify-between">
          <p className="max-w-[220px] text-[11px] leading-relaxed text-ink-500">
            Demo build — accounts and data live only in this browser.
          </p>
          <div className="radar-rings relative h-44 w-44 overflow-hidden rounded-full border border-white/10">
            <div className="radar-sweep absolute inset-0 rounded-full" />
            <span className="radar-blip absolute left-[62%] top-[30%] h-2 w-2 rounded-full bg-signal-400 shadow-[0_0_12px_rgba(244,88,28,0.9)]" />
            <span className="radar-blip absolute left-[30%] top-[58%] h-1.5 w-1.5 rounded-full bg-pine-400 shadow-[0_0_10px_rgba(26,154,152,0.9)]" style={{ animationDelay: "1.6s" }} />
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-500" />
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="bg-grid-faint flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="anim-fade-up w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-600 shadow-lg shadow-signal-600/30">
              <PlaneTakeoff className="h-5 w-5 text-white" />
            </span>
            <span>
              <span className="block font-display text-lg font-bold leading-tight text-ink-900">CareerPilot</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">AI career copilot</span>
            </span>
          </div>

          <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-xl shadow-ink-950/[0.06] sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              {isLogin ? "Welcome back, pilot" : "Create your account"}
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              {isLogin ? "Sign in to pick up your job search where you left off." : "One account for your applications, resume and interview practice."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {!isLogin && (
                <Field label="Full name" error={errors.name}>
                  {(id) => (
                    <TextInput id={id} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Riad Ahmed" invalid={!!errors.name} autoFocus />
                  )}
                </Field>
              )}
              <Field label="Email" error={errors.email}>
                {(id) => (
                  <TextInput id={id} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" invalid={!!errors.email} autoFocus={isLogin} autoComplete="email" />
                )}
              </Field>
              <Field label="Password" error={errors.password} hint={isLogin ? undefined : "At least 6 characters."}>
                {(id) => (
                  <TextInput id={id} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" invalid={!!errors.password} autoComplete={isLogin ? "current-password" : "new-password"} />
                )}
              </Field>
              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                {isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-ink-500">
              {isLogin ? "New to CareerPilot?" : "Already have an account?"}{" "}
              <Link to={isLogin ? "/register" : "/login"} className="font-bold text-signal-600 hover:text-signal-500">
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-100" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-300">or</span>
              <span className="h-px flex-1 bg-ink-100" />
            </div>

            <Button variant="outline" size="lg" className="w-full" onClick={handleDemo} loading={demoLoading}>
              {!demoLoading && <Sparkles className="h-4 w-4 text-signal-600" />}
              Explore the demo account
            </Button>
            <p className="mt-2 text-center text-[11px] text-ink-400">Pre-loaded with a resume, 4 applications, an analysis and an interview set.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
