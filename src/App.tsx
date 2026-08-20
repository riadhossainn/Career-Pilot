import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { PlaneTakeoff } from "lucide-react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./components/overlay";
import { AppShell } from "./components/layout/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { Jobs } from "./pages/Jobs";
import { JobDetails } from "./pages/JobDetails";
import { ResumePage } from "./pages/ResumePage";

function Splash() {
  return (
    <div className="bg-grid-dark flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-950">
      <div className="radar-rings relative h-28 w-28 overflow-hidden rounded-full border border-white/10">
        <div className="radar-sweep absolute inset-0 rounded-full" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-500" />
      </div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-600">
          <PlaneTakeoff className="h-4 w-4 text-white" />
        </span>
        <span className="font-display text-lg font-bold text-white">CareerPilot</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Establishing radar contact…</p>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  if (initializing) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route
              path="/"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/jobs"
              element={
                <Protected>
                  <Jobs />
                </Protected>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <Protected>
                  <JobDetails />
                </Protected>
              }
            />
            <Route
              path="/resume"
              element={
                <Protected>
                  <ResumePage />
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
