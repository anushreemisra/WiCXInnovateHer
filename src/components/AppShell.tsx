"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_BUSINESSES, type DemoBusinessKey } from "@/lib/ada/demo-businesses.ts";
import { WorkspaceProvider, useWorkspace } from "./Workspace";

// Ada's existing features: shown for context, not rebuilt.
const EXISTING = ["Dashboard", "Expense tracking", "Invoicing & payments", "Financial reporting", "Transaction history"];

// New Runway features.
const RUNWAY = [
  { label: "Fundability Score", href: "/score" },
  { label: "Funding Finder", href: "/finder" },
  { label: "WOSB certification", href: "/wosb" },
  { label: "SBA loan toolkit", href: "/sba" },
  { label: "Document vault", href: "/vault" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-3 border-b border-line bg-ink px-4 py-4 text-paper md:w-64 md:gap-6 md:border-b-0 md:border-r md:px-5 md:py-6">
        <div>
          <p className="text-2xl font-semibold tracking-tight">Ada</p>
          <p className="text-sm text-peach">Runway for women-owned businesses</p>
        </div>

        <nav aria-label="Runway" className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:flex-col md:overflow-visible md:pb-0">
          <p className="hidden px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-peach md:block">Runway · new</p>
          {RUNWAY.map(({ label, href }) => {
            const active = pathname === href || (href !== "/score" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-peach text-ink" : "text-paper hover:bg-white/10"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Existing Ada features" className="hidden flex-col gap-1 md:flex">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-paper/50">Existing Ada</p>
          {EXISTING.map((label) => (
            <span key={label} className="px-3 py-1.5 text-sm text-paper/45">
              {label}
            </span>
          ))}
          <p className="px-3 pt-1 text-xs text-paper/45">Runway reads their data; it doesn’t rebuild them.</p>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <BusinessBar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function BusinessBar() {
  const { businessKey, setBusinessKey, result } = useWorkspace();
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-3 text-sm sm:px-8">
      <label className="flex min-w-0 max-w-full items-center gap-2">
        <span className="shrink-0 font-medium text-muted">Demo business</span>
        <select
          value={businessKey}
          onChange={(e) => setBusinessKey(e.target.value as DemoBusinessKey)}
          className="min-w-0 max-w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-ink"
        >
          {Object.entries(DEMO_BUSINESSES).map(([key, b]) => (
            <option key={key} value={key}>
              {b.name} · {b.business} · {b.location}
            </option>
          ))}
        </select>
      </label>
      <span className="text-muted">
        Fundability <b className="text-ink">{result.total}</b> · band <b className="text-ink">{result.band.name}</b>
      </span>
    </div>
  );
}
