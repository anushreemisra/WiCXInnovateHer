"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ada's existing features: shown for context, not rebuilt.
const EXISTING = ["Dashboard", "Expense tracking", "Invoicing & payments", "Financial reporting", "Transaction history"];

// New Runway features. `href: null` = not built yet.
const RUNWAY: { label: string; href: string | null }[] = [
  { label: "Fundability Score", href: "/score" },
  { label: "Funding Finder", href: null },
  { label: "WOSB certification", href: null },
  { label: "SBA loan toolkit", href: null },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-line bg-ink px-5 py-6 text-paper md:w-64 md:border-b-0 md:border-r">
        <div>
          <p className="text-2xl font-semibold tracking-tight">Ada</p>
          <p className="text-sm text-peach">Runway for women-owned businesses</p>
        </div>

        <nav aria-label="Runway" className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-peach">Runway · new</p>
          {RUNWAY.map(({ label, href }) =>
            href ? (
              <Link
                key={label}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${pathname === href ? "bg-peach text-ink" : "text-paper hover:bg-white/10"}`}
              >
                {label}
              </Link>
            ) : (
              <span key={label} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-paper/60">
                {label}
                <span className="rounded-full border border-paper/30 px-2 py-0.5 text-[11px]">soon</span>
              </span>
            ),
          )}
        </nav>

        <nav aria-label="Existing Ada features" className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-paper/50">Existing Ada</p>
          {EXISTING.map((label) => (
            <span key={label} className="px-3 py-1.5 text-sm text-paper/45">
              {label}
            </span>
          ))}
          <p className="px-3 pt-1 text-xs text-paper/45">Runway reads their data; it doesn’t rebuild them.</p>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
