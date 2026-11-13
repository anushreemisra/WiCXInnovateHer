"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Metro } from "@/lib/ada/demo-businesses.ts";
import { SOURCES, VERIFIED_ON } from "@/lib/funding/sources.ts";
import { TYPE_LABEL, rankSources, type SourceType } from "@/lib/funding/rank.ts";
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

      <p className="text-sm text-muted">
        {shown.length} sources · checked on {VERIFIED_ON} · coming soon: filter by industry, stage and loan size
      </p>

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
              {reasons.map((r) => <li key={r} className="flex gap-2"><span aria-hidden="true" className="text-blue">✓</span>{r}</li>)}
              {cautions.map((c) => <li key={c} className="flex gap-2 text-accent"><span aria-hidden="true">!</span>{c}</li>)}
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
