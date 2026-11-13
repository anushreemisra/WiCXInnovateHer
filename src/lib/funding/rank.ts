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

export interface Link {
  label: string;
  href: string;
}

/** One line of the ranking’s reasoning, with a one-sentence justification and its sources. */
export interface Reason {
  text: string;
  why: string;
  links: Link[];
}

export interface Ranked {
  source: FundingSource;
  score: number;
  reasons: Reason[];
  cautions: Reason[];
}

const money = (n: number) =>
  n >= 1_000_000 ? `$${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `$${Math.round(n / 1000)}K` : `$${n.toLocaleString("en-US")}`;

const SCORE_LINK: Link = { label: "How your band and capacity are set", href: "/score" };

// Official pages describing each kind of funding.
const TYPE_REF: Partial<Record<SourceType, Link>> = {
  sba_microloan: { label: "SBA: Microloans", href: "https://www.sba.gov/funding-programs/loans/microloans" },
  microlender: { label: "SBA: Microloans", href: "https://www.sba.gov/funding-programs/loans/microloans" },
  bank: { label: "SBA: 7(a) loans", href: "https://www.sba.gov/funding-programs/loans/7a-loans" },
  credit_union: { label: "SBA: 7(a) loans", href: "https://www.sba.gov/funding-programs/loans/7a-loans" },
  matching_tool: { label: "SBA: Lender Match", href: "https://www.sba.gov/loans/lender-match/" },
  cdfi: { label: "U.S. Treasury CDFI Fund", href: "https://www.cdfifund.gov/" },
};

// Who each kind of funding usually serves.
const TYPE_WHO: Record<SourceType, string> = {
  cdfi: "Community lenders make loans to established small businesses that banks often turn down",
  microlender: "Microloans are small, flexible loans for businesses not yet ready for bank credit",
  sba_microloan: "SBA Microloans (up to $50,000) are for businesses not yet ready for bank credit",
  bank: "Banks lend to businesses with steady profits, a cash cushion and 2+ years of history",
  credit_union: "Credit unions lend to members with steady profits and a track record",
  grant: "Grants don’t have to be repaid, so they fit any stage",
  zero_interest_loan: "0% crowdfunded loans need no credit history, so they fit early-stage businesses",
  investor: "Investors fund high-growth startups, not most small businesses",
  advising: "Free advising helps at every stage",
  matching_tool: "Lender Match connects businesses ready for an SBA loan with interested lenders",
};

export function rankSources(
  sources: FundingSource[],
  opts: { metro: Metro; state: string; band: Band; capacity: number; startup: boolean },
): Ranked[] {
  const local = sources.filter(
    (s) => s.scope === "national" || s.metros.includes(opts.metro) || s.states.includes(opts.state),
  );
  return local
    .map((s): Ranked => {
      const reasons: Reason[] = [];
      const cautions: Reason[] = [];
      const site: Link = { label: `${s.name}: source`, href: s.sourceUrl };
      const typeLinks = [SCORE_LINK, ...(TYPE_REF[s.type] ? [TYPE_REF[s.type]!] : [])];
      let score = 0;

      if (s.scope === "national") {
        reasons.push({ text: "Open to businesses anywhere in the U.S.", why: `${s.name} accepts applicants nationwide, according to its own program page.`, links: [site] });
      } else {
        const inMetro = s.metros.includes(opts.metro);
        score += inMetro ? 40 : 30;
        reasons.push({
          text: inMetro ? "Serves your area" : `Serves businesses in ${opts.state}`,
          why: `${s.name} lists ${inMetro ? "your area" : opts.state} in its service area${s.eligibility ? `: ${s.eligibility.replace(/\.$/, "")}` : ""}.`,
          links: [site],
        });
      }

      if (BAND_FIT[opts.band.name].includes(s.type)) {
        score += 30;
        reasons.push({
          text: `A fit for your band (${opts.band.name})`,
          why: `Your Fundability band is ${opts.band.name}: ${TYPE_WHO[s.type]}.`,
          links: typeLinks,
        });
      } else if (!ALWAYS_OK.includes(s.type)) {
        cautions.push({
          text: `Usually for businesses in a different band than ${opts.band.name}`,
          why: `${TYPE_WHO[s.type]}, which matches a different band than your ${opts.band.name}.`,
          links: typeLinks,
        });
      }

      // Size checks only make sense once the books support some borrowing.
      if (s.amountMax !== null && s.type !== "grant" && opts.capacity > 0) {
        if (s.amountMax < 0.1 * opts.capacity) {
          // Far below what her business could carry: a poor use of an application.
          score -= 30;
          cautions.push({
            text: `Loans top out at ${money(s.amountMax)}, small for a business your size`,
            why: `${s.name} publishes a maximum of ${money(s.amountMax)}, under a tenth of the ${money(opts.capacity)} your books could support.`,
            links: [site, SCORE_LINK],
          });
        } else if ((s.amountMin ?? 0) <= opts.capacity) {
          score += 10;
          reasons.push({
            text: `Amounts up to ${money(s.amountMax)}, within what you could borrow`,
            why: `${s.name} publishes amounts up to ${money(s.amountMax)}, and your Fundability Score estimates you could borrow up to ${money(opts.capacity)}.`,
            links: [site, SCORE_LINK],
          });
        } else {
          cautions.push({
            text: `Starts at ${money(s.amountMin ?? 0)}, above your estimated capacity`,
            why: `${s.name}’s smallest amount is ${money(s.amountMin ?? 0)}, more than the ${money(opts.capacity)} your books could support.`,
            links: [site, SCORE_LINK],
          });
        }
      }

      score += { dedicated: 15, program: 10, claim: 3, none: 0 }[s.womenFocus];
      if (s.womenFocus === "dedicated") {
        reasons.push({ text: "Only for women-owned businesses", why: `${s.name} states that its funding or program is only for women-owned or women-led businesses.`, links: [site] });
      }
      if (s.womenFocus === "program") {
        reasons.push({ text: "Has a program for women-owned businesses", why: `${s.name} runs a program aimed at women entrepreneurs, open to others too.`, links: [site] });
      }
      if (s.womenFocus === "claim") {
        cautions.push({ text: "Women focus is the organization’s own claim", why: `${s.name} highlights women in its mission or marketing, but its lending rules don’t reserve funding for women.`, links: [site] });
      }

      score += { high: 5, medium: 2, low: 0 }[s.trust];

      if (s.ventureOnly && !opts.startup) {
        score -= 100;
        cautions.unshift({
          text: "Only for high-growth startups seeking investors",
          why: `${s.name} invests in early-stage companies aiming for large markets. Tick “I’m building a high-growth startup” to rank it normally.`,
          links: [site],
        });
      }
      return { source: s, score, reasons, cautions };
    })
    .sort((a, b) => b.score - a.score || a.source.name.localeCompare(b.source.name));
}
