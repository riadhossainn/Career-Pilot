import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, FileText, LayoutDashboard, LogOut, Menu, PlaneTakeoff, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Avatar, cn } from "../ui";

const NAV = [
  { to: "/", label: "Flight Deck", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Applications", icon: Briefcase, end: false },
  { to: "/resume", label: "Resume", icon: FileText, end: false },
];

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/jobs/")) return "Application Control";
  if (pathname.startsWith("/jobs")) return "Applications";
  if (pathname.startsWith("/resume")) return "Resume Profile";
  return "Flight Deck";
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-600 shadow-lg shadow-signal-600/40">
          <PlaneTakeoff className="h-5 w-5 text-white" />
        </span>
        <span>
          <span className="block font-display text-lg font-bold leading-tight text-white">CareerPilot</span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">AI career copilot</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-white/[0.07] text-white" : "text-ink-300 hover:bg-white/[0.04] hover:text-mist-100",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn("absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-signal-500 transition-opacity", isActive ? "opacity-100" : "opacity-0")} />
                <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-signal-400" : "text-ink-400 group-hover:text-ink-200")} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-4 px-4 pb-5">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold text-ink-300">
            <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Pilot AI engine · online
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-ink-500">Demo build — data is stored locally in this browser.</p>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.05] p-2.5">
            <Avatar name={user.full_name} className="h-9 w-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-mist-100">{user.full_name}</p>
              <p className="truncate text-[11px] text-ink-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-2 text-ink-400 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="glow-decor min-h-screen bg-mist-50">
      {/* Desktop sidebar */}
      <aside className="bg-grid-dark fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-white/5 bg-ink-950 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="anim-fade-in absolute inset-0 bg-ink-950/60 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="bg-grid-dark anim-fade-in absolute inset-y-0 left-0 w-[268px] bg-ink-950 shadow-2xl">
            <button
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 rounded-md p-1.5 text-ink-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="relative z-10 lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-mist-50/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
            <button
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md border border-ink-200 bg-white p-2 text-ink-600 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="font-display text-[15px] font-bold tracking-tight text-ink-900">{pageTitle(location.pathname)}</h1>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-pine-50 px-2.5 py-1 text-[11px] font-bold text-pine-700 ring-1 ring-inset ring-pine-200 sm:inline-flex">
              <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
              AI ready
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
