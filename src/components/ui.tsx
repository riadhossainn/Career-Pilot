import { useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown as ChevronDownIcon, Loader2 } from "lucide-react";
import type { JobStatus } from "../lib/db";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------ status meta ------------------------------ */

export const STATUS_META: Record<JobStatus, { pill: string; dot: string; bar: string }> = {
  Saved: { pill: "bg-slate-100 text-slate-700 ring-slate-300/70", dot: "bg-slate-400", bar: "bg-slate-400" },
  Applied: { pill: "bg-sky-50 text-sky-700 ring-sky-300/60", dot: "bg-sky-500", bar: "bg-sky-500" },
  Interview: { pill: "bg-amber-50 text-amber-700 ring-amber-300/70", dot: "bg-amber-500", bar: "bg-amber-500" },
  Offer: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-300/70", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  Rejected: { pill: "bg-rose-50 text-rose-700 ring-rose-300/60", dot: "bg-rose-500", bar: "bg-rose-500" },
};

export function StatusPill({ status, className }: { status: JobStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", meta.pill, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {status}
    </span>
  );
}

export function DifficultyChip({ level }: { level: "Easy" | "Medium" | "Hard" }) {
  const cls =
    level === "Easy"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-300/60"
      : level === "Medium"
        ? "bg-amber-50 text-amber-700 ring-amber-300/70"
        : "bg-rose-50 text-rose-700 ring-rose-300/60";
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", cls)}>{level}</span>;
}

export function CategoryChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-pine-50 px-2 py-0.5 text-[11px] font-semibold text-pine-700 ring-1 ring-inset ring-pine-200">
      {label}
    </span>
  );
}

export function ScoreChip({ score }: { score: number }) {
  const cls = score >= 7 ? "bg-emerald-600 text-white" : score >= 4 ? "bg-amber-500 text-white" : "bg-rose-600 text-white";
  return <span className={cn("rounded-md px-2 py-0.5 font-display text-xs font-bold tabular-nums", cls)}>{score}/10</span>;
}

/* -------------------------------- button -------------------------------- */

type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger" | "danger-ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-signal-600 text-white shadow-sm shadow-signal-600/30 hover:bg-signal-500",
  dark: "bg-ink-900 text-mist-50 hover:bg-ink-700",
  outline: "border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-mist-100",
  ghost: "text-ink-600 hover:bg-ink-900/5 hover:text-ink-900",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  "danger-ghost": "text-rose-600 hover:bg-rose-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...rest }: ButtonProps) {
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-2.5 text-sm" }[size];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/60 disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        sizes,
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* --------------------------------- fields -------------------------------- */

const controlBase =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 transition-shadow focus:border-signal-400 focus:outline-none focus:ring-2 focus:ring-signal-500/25";

interface FieldProps {
  label: string;
  error?: string | null;
  hint?: string;
  children: (id: string) => ReactNode;
  className?: string;
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wide text-ink-500">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(controlBase, invalid && "border-rose-400 focus:border-rose-400 focus:ring-rose-500/20", className)} {...rest} />;
}

export function TextArea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn(controlBase, "leading-relaxed", invalid && "border-rose-400 focus:border-rose-400 focus:ring-rose-500/20", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn(controlBase, "cursor-pointer appearance-none pr-8", className)} {...rest}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
    </span>
  );
}

/* ------------------------------- empty state ------------------------------ */

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("anim-fade-up flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white/60 text-center", compact ? "px-6 py-10" : "px-6 py-16")}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-pine-50 text-pine-600 ring-1 ring-inset ring-pine-200">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------------- gauge --------------------------------- */

export function scoreColor(score: number): string {
  if (score >= 75) return "#059669";
  if (score >= 50) return "#d97706";
  return "#e11d48";
}

export function Gauge({ value, size = 132, label = "match" }: { value: number; size?: number; label?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);

  useEffect(() => {
    const t = setTimeout(() => setOffset(c - (Math.min(100, Math.max(0, value)) / 100) * c), 60);
    return () => clearTimeout(t);
  }, [value, c]);

  const color = scoreColor(value);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-mist-200)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="gauge-arc"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-400">{label}</span>
      </div>
    </div>
  );
}

/* ------------------------------ misc helpers ------------------------------ */

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900 font-display text-sm font-bold text-signal-300", className)}>
      {initials || "?"}
    </span>
  );
}

export function SkeletonRows({ count = 3, height = "h-20" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("skeleton rounded-xl", height)} />
      ))}
    </div>
  );
}
