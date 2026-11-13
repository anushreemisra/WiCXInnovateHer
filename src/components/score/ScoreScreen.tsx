"use client";

import { useMemo, useState } from "react";
import { AS_OF, DEMO_BUSINESSES, generate, type DemoBusinessKey } from "@/lib/ada/demo-businesses.ts";
import { applyFix, computeMetrics, score, type FixKey } from "@/lib/fundability/engine.ts";
import { BandLadder, FactorList, NextBandPanel, RulesList, ScoreCard } from "./parts";

const FIX_LABELS: Record<FixKey, string> = {
  repay: "More left over after costs",
  cushion: "3-month cash cushion",
  trend: "Revenue up 10%",
  stability: "Steadier monthly revenue",
  concentration: "Biggest client at 20%",
};

export function ScoreScreen() {
  const [businessKey, setBusinessKey] = useState<DemoBusinessKey>("maya");
  const [applied, setApplied] = useState<FixKey[]>([]);
  const business = DEMO_BUSINESSES[businessKey];

  // Metrics come from 18 months of raw Ada records, computed once per business.
  const baseMetrics = useMemo(() => computeMetrics(generate(business), AS_OF), [business]);
  const baseline = useMemo(() => score(baseMetrics), [baseMetrics]);
  const current = useMemo(
    () => score(applied.reduce(applyFix, baseMetrics)),
    [applied, baseMetrics],
  );

  const simulate = (key: FixKey) => setApplied((a) => (a.includes(key) ? a : [...a, key]));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Fundability Score</p>
          <h1 className="text-3xl font-semibold tracking-tight">How a lender would read your books</h1>
          <p className="mt-1 text-ink-soft">
            Built from 12 months of your Ada transactions and invoices. Business data only; this is not a credit decision.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Demo business</span>
          <select
            value={businessKey}
            onChange={(e) => {
              setBusinessKey(e.target.value as DemoBusinessKey);
              setApplied([]);
            }}
            className="rounded-lg border border-line bg-card px-3 py-2 text-ink"
          >
            {Object.entries(DEMO_BUSINESSES).map(([key, b]) => (
              <option key={key} value={key}>
                {b.name} · {b.business} · {b.location}
              </option>
            ))}
          </select>
        </label>
      </header>

      {applied.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue/30 bg-blue/10 px-4 py-3 text-sm">
          <span className="font-semibold text-blue">Simulating:</span>
          {applied.map((k) => (
            <span key={k} className="rounded-full bg-card px-3 py-1 text-ink">{FIX_LABELS[k]}</span>
          ))}
          <button
            onClick={() => setApplied([])}
            className="ml-auto rounded-lg border border-blue/40 px-3 py-1 font-medium text-blue hover:bg-card"
          >
            Reset to today
          </button>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr_1.3fr]">
        <ScoreCard result={current} baseline={baseline} simulated={applied.length > 0} />
        <BandLadder current={current.band} />
        <NextBandPanel result={current} applied={applied} onSimulate={simulate} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <FactorList factors={current.factors} baseline={baseline.factors} />
        <RulesList result={current} />
      </section>
    </div>
  );
}
