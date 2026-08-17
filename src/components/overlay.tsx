import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button, cn } from "./ui";

/* ---------------------------------- modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close dialog" className="anim-fade-in absolute inset-0 cursor-default bg-ink-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("anim-pop relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl shadow-ink-950/30 sm:rounded-xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-mist-100 hover:text-ink-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <p className="text-sm leading-relaxed text-ink-600">{body}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------------------------- toast --------------------------------- */

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ push: (type: ToastType, message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}

const TOAST_ICON: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />,
  error: <XCircle className="h-4.5 w-4.5 text-rose-500" />,
  info: <Info className="h-4.5 w-4.5 text-sky-500" />,
};

const TOAST_EDGE: Record<ToastType, string> = {
  success: "border-l-emerald-500",
  error: "border-l-rose-500",
  info: "border-l-sky-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "anim-toast pointer-events-auto flex items-start gap-2.5 rounded-lg border border-ink-100 border-l-4 bg-white px-3.5 py-3 shadow-lg shadow-ink-950/10",
              TOAST_EDGE[t.type],
            )}
          >
            <span className="mt-px shrink-0">{TOAST_ICON[t.type]}</span>
            <p className="text-sm font-medium leading-snug text-ink-800">{t.message}</p>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              className="ml-auto shrink-0 rounded p-0.5 text-ink-300 hover:text-ink-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
