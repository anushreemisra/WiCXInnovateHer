// Fundability Score engine.
// Input: data shaped like Ada's existing features (transactions, invoices, profile).
// Output: a 0–100 score, each factor's points with the metric behind it, the band she is in,
// the funding that fits that band, and the fixes that would move her to the next band.

import type { AdaData } from "../ada/types.ts";

export const ASSUMPTIONS = {
  ownerLivingAllowance: 36000, // per year minimum; lenders count the owner's living costs ("global cash flow")
  targetCoverage: 1.25, // lenders typically want $1.25 of income per $1 of loan payments
  loanRate: 0.11, // reference loan for borrowing capacity: 11% APR...
  loanYears: 7, // ...over 7 years
};

export interface Band {
  name: "Strong" | "Ready" | "Building" | "Early";
  min: number;
  funding: string[]; // what the Funding Finder ranks first for this band
}

// Highest band first.
export const BANDS: Band[] = [
  { name: "Strong", min: 80, funding: ["Bank loans and lines of credit", "SBA 7(a) loans through banks", "Everything in Ready"] },
  { name: "Ready", min: 65, funding: ["SBA Microloans (up to $50K)", "Community development lenders (CDFIs)", "Credit unions"] },
  { name: "Building", min: 50, funding: ["Community lenders’ small and startup loans", "Grants for women-owned businesses", "0% crowdfunded loans (e.g. Kiva US)"] },
  { name: "Early", min: 0, funding: ["Grants for women-owned businesses", "0% crowdfunded loans (e.g. Kiva US)", "Free advising: SBA Women’s Business Centers, SCORE"] },
];

export type FactorKey = "repay" | "cushion" | "trend" | "stability" | "age" | "concentration";
export type FixKey = Exclude<FactorKey, "age">;

export interface Metrics {
  annualRevenue: number;
  annualOpex: number;
  annualDebt: number;
  ownerPay: number;
  netOperatingIncome: number; // left over after costs and owner pay
  margin: number;
  coverage: number; // net operating income ÷ existing loan payments
  growth: number;
  volatility: number;
  avgBalance: number;
  monthlyOutflow: number;
  cushionMonths: number;
  topClientShare: number;
  yearsInBusiness: number;
  twoYearDate: string;
}

export interface Factor {
  key: FactorKey;
  label: string;
  max: number;
  points: number;
  metric: string; // her number, in words
  rule: string; // how points are earned
  fix: string | null; // null when it can't be fixed (time)
}

export interface Gate {
  reason: string;
  cap: number;
  fix: string;
  fixKey: FixKey | null; // which simulated fix clears it; null when only time does
}

export interface Fix {
  key: FixKey;
  label: string;
  fix: string;
  points: number;
}

export interface NextBand {
  band: Band;
  pointsNeeded: number;
  blockers: Gate[];
  fixes: Fix[];
  reachable: boolean;
}

export interface ScoreResult {
  total: number;
  band: Band;
  factors: Factor[];
  gates: Gate[];
  capacity: number;
  next: NextBand | null;
}

// Linear interpolation between (x0, p0) and (x1, p1), clamped to the ends.
function scale(x: number, x0: number, p0: number, x1: number, p1: number): number {
  if (x0 > x1) return scale(-x, -x0, p0, -x1, p1);
  if (x <= x0) return p0;
  if (x >= x1) return p1;
  return p0 + ((x - x0) / (x1 - x0)) * (p1 - p0);
}

// Piecewise-linear through sorted [x, points] pairs.
function steps(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) return scale(x, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }
  return pts[pts.length - 1][1];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const monthKey = (d: string) => d.slice(0, 7);
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

// ---- Metrics computed from raw Ada data --------------------------------------------------

export function computeMetrics({ transactions, invoices, profile }: AdaData, asOf: string): Metrics {
  const months = [...new Set(transactions.map((t) => monthKey(t.date)))].sort();
  const last12 = months.slice(-12);
  const tx12 = transactions.filter((t) => last12.includes(monthKey(t.date)));
  const total = (type: string, filter: (t: (typeof tx12)[number]) => boolean = () => true) =>
    sum(tx12.filter((t) => t.type === type && filter(t)).map((t) => Math.abs(t.amount)));

  const scaleToYear = 12 / last12.length; // young businesses have < 12 months
  const revenue12 = total("income");
  const annualRevenue = revenue12 * scaleToYear;
  const annualOpex = total("expense", (t) => !t.personal) * scaleToYear;
  const annualDebt = total("debt_payment") * scaleToYear;
  // Owner pay = what she actually takes out, but never less than a basic living allowance
  const ownerPay = Math.max(total("owner_draw") * scaleToYear, ASSUMPTIONS.ownerLivingAllowance);

  // Monthly revenue series
  const revByMonth = months.map((m) =>
    sum(transactions.filter((t) => t.type === "income" && monthKey(t.date) === m).map((t) => t.amount)),
  );
  const rev12 = revByMonth.slice(-12);
  const half = Math.floor(Math.min(12, revByMonth.length) / 2);
  const recent = sum(revByMonth.slice(-half));
  const prior = sum(revByMonth.slice(-2 * half, -half));
  const mean = sum(rev12) / rev12.length;
  const sd = Math.sqrt(sum(rev12.map((r) => (r - mean) ** 2)) / rev12.length);

  // Cash cushion: average month-end balance over the last 3 months
  const balances = months.slice(-3).map((m) => {
    const inMonth = transactions.filter((t) => monthKey(t.date) === m);
    return inMonth[inMonth.length - 1].balance;
  });

  // Client concentration: biggest invoiced client's share of total revenue
  const byClient: Record<string, number> = {};
  for (const i of invoices.filter((i) => last12.includes(monthKey(i.issued)))) {
    byClient[i.client] = (byClient[i.client] || 0) + i.amount;
  }

  const founded = new Date(profile.founded);
  const twoYearDate = new Date(Date.UTC(founded.getUTCFullYear() + 2, founded.getUTCMonth(), founded.getUTCDate()));

  return derive({
    annualRevenue, annualOpex, annualDebt, ownerPay,
    growth: prior > 0 ? (recent - prior) / prior : 0,
    volatility: mean > 0 ? sd / mean : 1,
    avgBalance: sum(balances) / balances.length,
    topClientShare: revenue12 > 0 ? Math.max(0, ...Object.values(byClient)) / revenue12 : 0,
    yearsInBusiness: (new Date(asOf).getTime() - founded.getTime()) / (365.25 * 86400000),
    twoYearDate: twoYearDate.toISOString().slice(0, 10),
  });
}

type BaseMetrics = Omit<Metrics, "netOperatingIncome" | "margin" | "coverage" | "monthlyOutflow" | "cushionMonths">;

// Values that follow from the base numbers; recomputed after every simulated fix.
function derive(b: BaseMetrics): Metrics {
  const netOperatingIncome = b.annualRevenue - b.annualOpex - b.ownerPay;
  const monthlyOutflow = (b.annualOpex + b.annualDebt) / 12;
  return {
    ...b,
    netOperatingIncome,
    margin: b.annualRevenue > 0 ? netOperatingIncome / b.annualRevenue : 0,
    coverage: b.annualDebt > 0 ? netOperatingIncome / b.annualDebt : netOperatingIncome > 0 ? Infinity : 0,
    monthlyOutflow,
    cushionMonths: monthlyOutflow > 0 ? b.avgBalance / monthlyOutflow : 12,
  };
}

// ---- Simulated fixes ---------------------------------------------------------------------

// Moves one number to the level that earns full points (or clears its dealbreaker), leaving
// everything else as it is.
export function applyFix(m: Metrics, key: FixKey): Metrics {
  const next: BaseMetrics = { ...m };
  switch (key) {
    case "repay": {
      // Trim costs until 15% of revenue is left over and loan payments are covered 1.5×
      const target = Math.max(m.netOperatingIncome, 0.15 * m.annualRevenue, 1.5 * m.annualDebt);
      next.annualOpex = Math.max(0, m.annualOpex - (target - m.netOperatingIncome));
      break;
    }
    case "cushion":
      next.avgBalance = Math.max(m.avgBalance, 3 * m.monthlyOutflow);
      break;
    case "trend":
      next.growth = Math.max(m.growth, 0.1);
      break;
    case "stability":
      next.volatility = Math.min(m.volatility, 0.15);
      break;
    case "concentration":
      next.topClientShare = Math.min(m.topClientShare, 0.2);
      break;
  }
  return derive(next);
}

// ---- Scoring -----------------------------------------------------------------------------

export function score(m: Metrics): ScoreResult {
  const f: Factor[] = [];
  const add = (key: FactorKey, label: string, max: number, points: number, metric: string, rule: string, fix: string | null) =>
    f.push({ key, label, max, points: round1(Math.min(max, Math.max(0, points))), metric, rule, fix });

  // Two tests, the weaker one counts: covering existing loan payments, and how much of each
  // dollar of revenue is left after costs and owner pay (room for a new loan).
  const coverageShare = m.netOperatingIncome <= 0 ? 0 : steps(m.coverage, [[0, 0], [1.0, 0.4], [1.25, 0.8], [1.5, 1]]);
  const marginShare = scale(m.margin, 0, 0, 0.15, 1);
  add("repay", "Can the business afford loan payments?", 35, 35 * Math.min(coverageShare, marginShare),
    m.netOperatingIncome <= 0 ? "Costs and owner pay exceed revenue"
      : `${pct(m.margin)} of revenue left after costs and owner pay` +
        (m.annualDebt > 0 ? `; covers existing loan payments ${m.coverage.toFixed(2)}×` : "; no existing loans"),
    "Full points when 15% of revenue is left after costs and owner pay, and existing loans are covered 1.5×",
    m.netOperatingIncome <= 0
      ? `Close the ${money(-m.netOperatingIncome)}/yr gap between revenue and costs plus owner pay`
      : marginShare < coverageShare
        ? `Keep 15% of revenue after costs and owner pay (now ${pct(m.margin)}): raise prices or trim costs`
        : `Raise income or cut costs until it covers loan payments 1.5× (now ${m.coverage.toFixed(2)}×)`);

  add("cushion", "Cash cushion", 20, steps(m.cushionMonths, [[0, 0], [1, 7], [3, 20]]),
    `${m.cushionMonths.toFixed(1)} months of expenses in the bank`,
    "Full points at 3 months of costs and loan payments in the bank",
    `Build the average balance to ${money(3 * m.monthlyOutflow)} (3 months of expenses; now ${money(m.avgBalance)})`);

  add("trend", "Revenue direction", 10, steps(m.growth, [[-0.2, 0], [0, 6], [0.1, 10]]),
    `Revenue ${m.growth >= 0 ? "up" : "down"} ${pct(Math.abs(m.growth))} vs the previous 6 months`,
    "Full points when the last 6 months are 10% above the 6 before",
    "Grow revenue 10% over the next 6 months");

  add("stability", "Revenue steadiness", 10, scale(m.volatility, 0.15, 10, 0.6, 0),
    `Monthly revenue swings ±${pct(m.volatility)} around its average`,
    "Full points when monthly revenue stays within ±15% of its average",
    "Smooth monthly revenue to within ±15% (retainers, memberships, prepaid packages)");

  add("age", "Time in business", 12, steps(m.yearsInBusiness, [[0, 0], [1, 5], [2, 10], [3, 12]]),
    `${m.yearsInBusiness.toFixed(1)} years in business`,
    "Full points at 3 years; most banks want at least 2",
    null);

  add("concentration", "Not relying on one client", 13, scale(m.topClientShare, 0.2, 13, 0.7, 0),
    m.topClientShare > 0 ? `Biggest client = ${pct(m.topClientShare)} of revenue` : "No single invoiced client; sales spread across customers",
    "Full points when no client is more than 20% of revenue",
    `Bring the biggest client to 20% of revenue or less (now ${pct(m.topClientShare)})`);

  const total = Math.round(sum(f.map((x) => x.points)));

  // Gates: dealbreakers a lender checks before looking at points. Each one caps the band.
  const gates: Gate[] = [];
  if (m.netOperatingIncome <= 0) gates.push({
    reason: "Losing money after costs and owner pay", cap: 49, fixKey: "repay",
    fix: `Close the ${money(-m.netOperatingIncome)}/yr gap between revenue and costs plus owner pay`,
  });
  if (m.yearsInBusiness < 2) gates.push({
    reason: "Most banks want 2+ years in business", cap: 79, fixKey: null,
    fix: `Only time fixes this: 2 years on ${formatDate(m.twoYearDate)}`,
  });
  if (m.topClientShare > 0.5) gates.push({
    reason: "Over half her income comes from one client", cap: 79, fixKey: "concentration",
    fix: `Bring the biggest client under 50% of revenue (now ${pct(m.topClientShare)})`,
  });
  const cap = Math.min(100, ...gates.map((g) => g.cap));
  const band = BANDS.find((b) => Math.min(total, cap) >= b.min)!;

  return { total, band, factors: f, gates, capacity: borrowingCapacity(m), next: nextBand(total, band, f, gates) };
}

// What it takes to reach the band above: dealbreakers to clear, then the biggest point gains.
function nextBand(total: number, current: Band, factors: Factor[], gates: Gate[]): NextBand | null {
  const i = BANDS.indexOf(current);
  if (i === 0) return null; // already Strong
  const target = BANDS[i - 1];
  const blockers = gates.filter((g) => g.cap < target.min);
  const needed = Math.max(0, target.min - total);
  const fixes: Fix[] = [];
  let gained = 0;
  const options = factors
    .filter((x) => x.fix && x.max - x.points >= 0.5 && !blockers.some((b) => b.fixKey === x.key))
    .sort((a, b) => b.max - b.points - (a.max - a.points));
  for (const x of options) {
    if (gained >= needed) break;
    fixes.push({ key: x.key as FixKey, label: x.label, fix: x.fix!, points: round1(x.max - x.points) });
    gained += x.max - x.points;
  }
  return { band: target, pointsNeeded: round1(needed), blockers, fixes, reachable: gained >= needed };
}

// Largest loan whose payments keep income ≥ 1.25× all loan payments.
export function borrowingCapacity(m: Metrics): number {
  const { targetCoverage, loanRate, loanYears } = ASSUMPTIONS;
  const room = m.netOperatingIncome / targetCoverage - m.annualDebt;
  if (room <= 0) return 0;
  const r = loanRate / 12, n = loanYears * 12;
  const principal = ((room / 12) * (1 - (1 + r) ** -n)) / r;
  return Math.floor(principal / 1000) * 1000;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
