// Prints each demo business's score and band panel, then simulates fixes on Maya.
// Run: node scripts/fundability-report.ts
import { applyFix, computeMetrics, score, type FixKey } from "../src/lib/fundability/engine.ts";
import { AS_OF, DEMO_BUSINESSES, generate } from "../src/lib/ada/demo-businesses.ts";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

for (const p of Object.values(DEMO_BUSINESSES)) {
  const m = computeMetrics(generate(p), AS_OF);
  const s = score(m);
  console.log(`\n=== ${p.name} · ${p.business} · ${p.location}`);
  console.log(`Score ${s.total}/100 → band ${s.band.name}; estimated borrowing capacity ${fmt(s.capacity)}`);
  for (const g of s.gates) console.log(`  RULE: ${g.reason}`);
  for (const f of s.factors) console.log(`  ${String(f.points).padStart(4)} / ${String(f.max).padEnd(2)}  ${f.label.padEnd(30)} ${f.metric}`);
  console.log(`  Funding for ${s.band.name}: ${s.band.funding.join(" · ")}`);
  if (s.next) {
    console.log(`  To reach ${s.next.band.name} (${s.next.band.min}+): ${s.next.pointsNeeded} more points`);
    for (const b of s.next.blockers) console.log(`    BLOCKER  ${b.reason} → ${b.fix}`);
    for (const x of s.next.fixes) console.log(`    +${String(x.points).padEnd(4)}   ${x.fix}`);
  }
}

console.log("\n=== Maya: simulated fixes (cumulative)");
let m = computeMetrics(generate(DEMO_BUSINESSES.maya), AS_OF);
for (const key of [null, "concentration", "trend"] as (FixKey | null)[]) {
  if (key) m = applyFix(m, key);
  const s = score(m);
  console.log(`  ${String(s.total).padStart(3)}  ${fmt(s.capacity).padStart(9)}  ${(key ?? "today").padEnd(14)} ${s.band.name}`);
}
