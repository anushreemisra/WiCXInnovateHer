// Funding Finder ranking: deterministic, explainable, and never influenced by referral fees.
// Order of importance: serves her area → fits her band → amount within what she could borrow
// → evidence of a focus on women-owned businesses.

import type { Metro } from "../ada/demo-businesses.ts";
import type { Band } from "../fundability/engine.ts";

export type SourceType =
  | "cdfi" | "microlender" | "sba_microloan" | "bank" | "credit_union"
  | "grant" | "zero_interest_loan" | "investor" | "advising" | "matching_tool";

export interface FundingSource {
  id: string;
  name: string;
  type: SourceType;
  scope: "metro" | "state" | "national";
  metros: Metro[];
  states: string[];
  amountMin: number | null;
  amountMax: number | null;
  womenFocus: "dedicated" | "program" | "claim" | "none";
  trust: "high" | "medium" | "low";
  summary: string;
  eligibility: string;
  url: string;
  sourceUrl: string;
  ventureOnly: boolean;
}

export const TYPE_LABEL: Record<SourceType, string> = {
  cdfi: "Community lender (CDFI)",
  microlender: "Microlender",
  sba_microloan: "SBA Microloan lender",
  bank: "Bank",
  credit_union: "Credit union",
  grant: "Grant",
  zero_interest_loan: "0% loan",
  investor: "Investor",
  advising: "Free advising",
  matching_tool: "Lender matching",
};

// Which kinds of funding fit each band (mirrors the bands' funding lists).
const BAND_FIT: Record<Band["name"], SourceType[]> = {
  Strong: ["bank", "credit_union", "matching_tool", "cdfi", "sba_microloan", "microlender"],
  Ready: ["sba_microloan", "cdfi", "credit_union", "microlender", "matching_tool"],
  Building: ["cdfi", "microlender", "sba_microloan", "grant", "zero_interest_loan"],
  Early: ["grant", "zero_interest_loan", "advising", "microlender"],
};
// Free advising and grants help at every stage, so they never count against a source.
const ALWAYS_OK: SourceType[] = ["advising", "grant"];

export interface Ranked {
  source: FundingSource;
  score: number;
  reasons: string[];
  cautions: string[];
}

const money = (n: number) =>
  n >= 1_000_000 ? `$${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `$${Math.round(n / 1000)}K` : `$${n.toLocaleString("en-US")}`;

export function rankSources(
  sources: FundingSource[],
  opts: { metro: Metro; state: string; band: Band; capacity: number; startup: boolean },
): Ranked[] {
  const local = sources.filter(
    (s) => s.scope === "national" || s.metros.includes(opts.metro) || s.states.includes(opts.state),
  );
  return local
    .map((s): Ranked => {
      const reasons: string[] = [];
      const cautions: string[] = [];
      let score = 0;

      if (s.scope === "national") reasons.push("Open to businesses anywhere in the U.S.");
      else {
        score += s.metros.includes(opts.metro) ? 40 : 30;
        reasons.push(s.metros.includes(opts.metro) ? "Serves your area" : `Serves businesses in ${opts.state}`);
      }

      if (BAND_FIT[opts.band.name].includes(s.type)) {
        score += 30;
        reasons.push(`A fit for your band (${opts.band.name})`);
      } else if (!ALWAYS_OK.includes(s.type)) {
        cautions.push(`Usually for businesses in a different band than ${opts.band.name}`);
      }

      // Size checks only make sense once the books support some borrowing.
      if (s.amountMax !== null && s.type !== "grant" && opts.capacity > 0) {
        if (s.amountMax < 0.1 * opts.capacity) {
          // Far below what her business could carry: a poor use of an application.
          score -= 30;
          cautions.push(`Loans top out at ${money(s.amountMax)}, small for a business your size`);
        } else if ((s.amountMin ?? 0) <= opts.capacity) {
          score += 10;
          reasons.push(`Amounts up to ${money(s.amountMax)}, within what you could borrow`);
        } else if ((s.amountMin ?? 0) > opts.capacity) {
          cautions.push(`Starts at ${money(s.amountMin ?? 0)}, above your estimated capacity`);
        }
      }

      score += { dedicated: 15, program: 10, claim: 3, none: 0 }[s.womenFocus];
      if (s.womenFocus === "dedicated") reasons.push("Only for women-owned businesses");
      if (s.womenFocus === "program") reasons.push("Has a program for women-owned businesses");
      if (s.womenFocus === "claim") cautions.push("Women focus is the organization’s own claim");

      score += { high: 5, medium: 2, low: 0 }[s.trust];

      if (s.ventureOnly && !opts.startup) {
        score -= 100;
        cautions.unshift("Only for high-growth startups seeking investors");
      }
      return { source: s, score, reasons, cautions };
    })
    .sort((a, b) => b.score - a.score || a.source.name.localeCompare(b.source.name));
}
