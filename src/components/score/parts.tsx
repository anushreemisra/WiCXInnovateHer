import { BANDS, type Band, type Factor, type FixKey, type ScoreResult } from "@/lib/fundability/engine.ts";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Every band also says its name in text, so colour never carries the meaning alone.
const BAND_STYLE: Record<Band["name"], string> = {
  Strong: "bg-blue text-paper",
  Ready: "bg-[#2f6f62] text-paper",
  Building: "bg-peach text-ink",
  Early: "bg-accent text-paper",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-5 ${className}`}>{children}</div>;
}

function Delta({ value, unit = "" }: { value: number; unit?: string }) {
  if (Math.round(value) === 0) return null;
  const up = value > 0;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${up ? "bg-blue/10 text-blue" : "bg-accent/10 text-accent"}`}>
      {up ? "+" : "−"}
      {unit === "$" ? money(Math.abs(value)) : Math.abs(Math.round(value))} vs today
    </span>
  );
}

export function ScoreCard({ result, baseline, simulated }: { result: ScoreResult; baseline: ScoreResult; simulated: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none" stroke="var(--ink)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(result.total / 100) * c} ${c}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tabular-nums">{result.total}</span>
          <span className="text-sm text-muted">out of 100</span>
        </div>
      </div>
      {simulated && <Delta value={result.total - baseline.total} />}
      <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${BAND_STYLE[result.band.name]}`}>
        Band: {result.band.name}
        {simulated && result.band.name !== baseline.band.name && ` (was ${baseline.band.name})`}
      </span>
      <div>
        <p className="text-sm text-muted">Could borrow up to about</p>
        <p className="text-2xl font-semibold tabular-nums">{money(result.capacity)}</p>
        {simulated && <Delta value={result.capacity - baseline.capacity} unit="$" />}
        <p className="mt-1 text-xs text-muted">Keeps income at 1.25× loan payments; 7-year loan at 11%</p>
      </div>
    </Card>
  );
}

export function BandLadder({ current }: { current: Band }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Where you are, and what fits</h2>
      <ol className="flex flex-col gap-2">
        {BANDS.map((b) => {
          const here = b.name === current.name;
          return (
            <li
              key={b.name}
              aria-current={here ? "step" : undefined}
              className={`rounded-xl border p-3 ${here ? "border-ink bg-paper" : "border-transparent opacity-60"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BAND_STYLE[b.name]}`}>{b.name}</span>
                <span className="text-xs text-muted">{b.min > 0 ? `${b.min}+` : "under 50"}</span>
                {here && <span className="ml-auto text-xs font-semibold">You are here</span>}
              </div>
              {here && (
                <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft">
                  {b.funding.map((f) => <li key={f}>{f}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted">The Funding Finder will rank these sources first, near your location.</p>
    </Card>
  );
}

export function NextBandPanel({ result, applied, onSimulate }: {
  result: ScoreResult;
  applied: FixKey[];
  onSimulate: (key: FixKey) => void;
}) {
  const next = result.next;
  if (!next) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">You’re in the top band</h2>
        <p className="text-sm text-ink-soft">
          Lenders would see a business ready for bank and SBA 7(a) loans. Raising your numbers further mainly increases how much you could borrow.
        </p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">To reach {next.band.name}</h2>
        <p className="text-sm text-ink-soft">
          {next.pointsNeeded > 0 ? `${next.pointsNeeded} more points needed` : "You have the points"}
          {next.blockers.length > 0 && `${next.pointsNeeded > 0 ? ", and" : ", but"} ${next.blockers.length === 1 ? "one dealbreaker stands" : "dealbreakers stand"} in the way.`}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {next.blockers.map((b) => (
          <li key={b.reason} className="rounded-xl border border-accent/40 bg-accent/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Dealbreaker</p>
            <p className="font-medium">{b.reason}</p>
            <p className="text-sm text-ink-soft">{b.fix}</p>
            {b.fixKey && <SimulateButton fixKey={b.fixKey} applied={applied} onSimulate={onSimulate} />}
          </li>
        ))}
        {next.fixes.map((f) => (
          <li key={f.key} className="rounded-xl border border-line p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium">{f.label}</p>
              <span className="shrink-0 text-sm font-semibold text-blue">+{f.points} pts</span>
            </div>
            <p className="text-sm text-ink-soft">{f.fix}</p>
            <SimulateButton fixKey={f.key} applied={applied} onSimulate={onSimulate} />
          </li>
        ))}
      </ul>
      {!next.reachable && (
        <p className="text-xs text-muted">Fixes alone can’t close the gap yet; time in business will add points.</p>
      )}
    </Card>
  );
}

function SimulateButton({ fixKey, applied, onSimulate }: { fixKey: FixKey; applied: FixKey[]; onSimulate: (k: FixKey) => void }) {
  const done = applied.includes(fixKey);
  return (
    <button
      onClick={() => onSimulate(fixKey)}
      disabled={done}
      className="mt-2 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-ink-soft disabled:bg-paper-2 disabled:text-muted"
    >
      {done ? "Simulated" : "Simulate this fix"}
    </button>
  );
}

export function FactorList({ factors, baseline }: { factors: Factor[]; baseline: Factor[] }) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">The six checks</h2>
        <p className="text-sm text-ink-soft">What a loan officer looks at, measured from your Ada records. Points rise in a straight line between zero and full.</p>
      </div>
      <ul className="flex flex-col gap-4">
        {factors.map((f) => {
          const before = baseline.find((b) => b.key === f.key)!;
          const changed = before.points !== f.points;
          return (
            <li key={f.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{f.label}</p>
                <p className="shrink-0 tabular-nums">
                  <span className="font-semibold">{f.points}</span>
                  <span className="text-muted"> / {f.max}</span>
                  {changed && <span className="ml-2 text-xs text-blue">was {before.points}</span>}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-2" role="presentation">
                <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${(f.points / f.max) * 100}%` }} />
              </div>
              <p className="text-sm text-ink-soft">{f.metric}</p>
              <p className="text-xs text-muted">{f.rule}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const RULES = [
  { reason: "Losing money after costs and owner pay", cap: "Early" },
  { reason: "Most banks want 2+ years in business", cap: "Ready" },
  { reason: "Over half her income comes from one client", cap: "Ready" },
];

export function RulesList({ result }: { result: ScoreResult }) {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Dealbreakers</h2>
        <p className="text-sm text-ink-soft">Checked before the points. Each one caps the band, whatever the score.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {RULES.map((rule) => {
          const hit = result.gates.some((g) => g.reason === rule.reason);
          return (
            <li key={rule.reason} className={`rounded-xl border p-3 text-sm ${hit ? "border-accent/40 bg-accent/5" : "border-line"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${hit ? "text-accent" : "text-muted"}`}>
                {hit ? `Applies · capped at ${rule.cap}` : "Clear"}
              </p>
              <p>{rule.reason.replace("her income", "your income")}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
