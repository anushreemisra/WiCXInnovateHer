"use client";

import { useEffect, useMemo, useState } from "react";
import { applyFix, score, type FixKey } from "@/lib/fundability/engine.ts";
import { useWorkspace } from "../Workspace";
import { BandLadder, FactorList, NextBandPanel, RulesList, ScoreCard } from "./parts";

const FIX_LABELS: Record<FixKey, string> = {
  repay: "More left over after costs",
  cushion: "3-month cash cushion",
  trend: "Revenue up 10%",
  stability: "Steadier monthly revenue",
  concentration: "Biggest client at 20%",
};

export function ScoreScreen() {
  const { businessKey, metrics: baseMetrics, result: baseline } = useWorkspace();
  const [applied, setApplied] = useState<FixKey[]>([]);
  // A different business starts with no simulated fixes.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the shared business changes
  useEffect(() => setApplied([]), [businessKey]);

  const current = useMemo(
    () => score(applied.reduce(applyFix, baseMetrics)),
    [applied, baseMetrics],
  );

  const simulate = (key: FixKey) => setApplied((a) => (a.includes(key) ? a : [...a, key]));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Fundability Score</p>
          <h1 className="text-3xl font-semibold tracking-tight">How a lender would read your books</h1>
        </div>
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
