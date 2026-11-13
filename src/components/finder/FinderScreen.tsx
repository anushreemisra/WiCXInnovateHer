"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Metro } from "@/lib/ada/demo-businesses.ts";
import { SOURCES, VERIFIED_ON } from "@/lib/funding/sources.ts";
import { TYPE_LABEL, rankSources, type Reason, type SourceType } from "@/lib/funding/rank.ts";
import { useWorkspace } from "../Workspace";

const METROS: { value: Metro; label: string; state: string }[] = [
  { value: "sf-bay", label: "San Francisco Bay Area, CA", state: "CA" },
  { value: "austin", label: "Austin, TX", state: "TX" },
  { value: "atlanta", label: "Atlanta, GA", state: "GA" },
  { value: "nyc", label: "New York City, NY", state: "NY" },
];

const GROUPS: { label: string; types: SourceType[] }[] = [
  { label: "Loans", types: ["cdfi", "microlender", "sba_microloan", "bank", "credit_union", "zero_interest_loan", "matching_tool"] },
  { label: "Grants", types: ["grant"] },
  { label: "Investors", types: ["investor"] },
  { label: "Free advising", types: ["advising"] },
];

const money = (n: number) => "$" + n.toLocaleString("en-US");
const amountText = (min: number | null, max: number | null) =>
  max === null ? null : min ? `${money(min)}–${money(max)}` : `Up to ${money(max)}`;

const TRUST_LABEL = { high: "Verified terms", medium: "Program page", low: "Their claim" };

export function FinderScreen() {
  const { business, result } = useWorkspace();
  const [metro, setMetro] = useState<Metro>(business.metro);
  const [group, setGroup] = useState<string>("All");
  const [startup, setStartup] = useState(false);
  // Follow the demo business's location when it changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with the shared business
  useEffect(() => setMetro(business.metro), [business.metro]);

  const state = METROS.find((m) => m.value === metro)!.state;
  const ranked = useMemo(
    () => rankSources(SOURCES, { metro, state, band: result.band, capacity: result.capacity, startup }),
    [metro, state, result.band, result.capacity, startup],
  );
  const shown = group === "All" ? ranked : ranked.filter((r) => GROUPS.find((g) => g.label === group)!.types.includes(r.source.type));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Funding Finder</p>
        <h1 className="text-3xl font-semibold tracking-tight">Who funds women-owned businesses near you</h1>
        <p className="mt-1 text-ink-soft">
          Ranked by: serves your area, fits your band ({result.band.name}), amount within what you could borrow
          ({money(result.capacity)}), then focus on women-owned businesses. Rankings never depend on referral fees.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Location</span>
          <select value={metro} onChange={(e) => setMetro(e.target.value as Metro)} className="rounded-lg border border-line bg-paper px-3 py-2">
            {METROS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Show</span>
          <div className="flex flex-wrap gap-2">
            {["All", ...GROUPS.map((g) => g.label)].map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                aria-pressed={group === g}
                className={`rounded-lg border px-3 py-1.5 ${group === g ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm sm:ml-auto">
          <input type="checkbox" checked={startup} onChange={(e) => setStartup(e.target.checked)} className="h-4 w-4" />
          I’m building a high-growth startup
        </label>
      </div>

      <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          {shown.length} sources · checked on {VERIFIED_ON} · coming soon: filter by industry, stage and loan size
        </p>
        <p className="flex items-center gap-1.5 text-ink-soft">
          <InfoIcon /> Hover over or tap any reason to see why, with sources
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {shown.map(({ source: s, reasons, cautions }, i) => (
          <li key={s.id} className={`rounded-2xl border bg-card p-5 ${s.ventureOnly && !startup ? "border-line opacity-70" : "border-line"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  #{i + 1} · {TYPE_LABEL[s.type]} · {s.scope === "national" ? "National" : s.scope === "state" ? state : "Local"}
                </p>
                <h2 className="text-xl font-semibold">{s.name}</h2>
                <p className="mt-1 text-ink-soft">{s.summary}</p>
                {s.eligibility && <p className="mt-1 text-sm text-muted">Eligibility: {s.eligibility}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                {amountText(s.amountMin, s.amountMax) && <span className="text-lg font-semibold tabular-nums">{amountText(s.amountMin, s.amountMax)}</span>}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.trust === "low" ? "bg-paper-2 text-ink-soft" : "bg-blue/10 text-blue"}`}>
                  {TRUST_LABEL[s.trust]}
                </span>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {reasons.map((r) => <ReasonItem key={r.text} reason={r} kind="reason" />)}
              {cautions.map((c) => <ReasonItem key={c.text} reason={c} kind="caution" />)}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {s.type !== "advising" && s.type !== "matching_tool" && !s.ventureOnly && (
                <Link href={`/apply/${s.id}`} className="rounded-lg bg-ink px-3 py-1.5 font-medium text-paper hover:bg-ink-soft">
                  Start application
                </Link>
              )}
              <a href={s.url} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-ink">
                Visit site ↗
              </a>
              {s.sourceUrl !== s.url && (
                <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="px-1 py-1.5 text-muted underline">Source</a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// A ranking reason that reveals its justification and sources on hover, keyboard focus or tap.
function ReasonItem({ reason, kind }: { reason: Reason; kind: "reason" | "caution" }) {
  const caution = kind === "caution";
  return (
    <li className="group relative flex gap-2">
      <span aria-hidden="true" className={caution ? "text-accent" : "text-blue"}>{caution ? "!" : "✓"}</span>
      <button
        type="button"
        className={`flex items-center gap-1.5 text-left underline decoration-dotted underline-offset-4 ${caution ? "text-accent decoration-accent/50" : "decoration-muted"}`}
      >
        {reason.text}
        <InfoIcon />
      </button>
      {/* pt-2 bridges the gap so the pointer can move into the box and click a link */}
      <div className="invisible absolute left-6 top-full z-20 w-[min(22rem,80vw)] pt-2 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="rounded-xl border border-line bg-card p-3 text-sm text-ink shadow-lg">
          <p>{reason.why}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {reason.links.map((l) =>
              l.href.startsWith("/") ? (
                <li key={l.href}><Link href={l.href} className="text-blue underline">{l.label}</Link></li>
              ) : (
                <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer" className="text-blue underline">{l.label} ↗</a></li>
              ),
            )}
          </ul>
        </div>
      </div>
    </li>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-70">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4M8 4.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
