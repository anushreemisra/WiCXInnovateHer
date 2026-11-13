// Requirement lists for each toolkit, built on the shared application engine.
// Rules checked against 13 CFR 121 and 127, SBA SOP 50 10 8.1 and sba.gov program pages (Nov 2026).

import type { EntityType } from "../ada/types.ts";
import type { SourceType } from "../funding/rank.ts";
import { formationDocs, type Requirement } from "./requirements.ts";

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];

// ---- WOSB / EDWOSB certification ---------------------------------------------------------

export const WOSB = {
  portal: { name: "SBA Certifications", url: "https://certifications.sba.gov/" },
  yearsValid: 3,
  contractingGoal: "5%",
  edwosbLimits: { netWorth: 850_000, income: 400_000, assets: 6_500_000 },
};

// SBA size standards (13 CFR 121.201) for the demo businesses’ industries. Receipts-based limits
// are averaged over the last 5 completed fiscal years; some industries are sized by employees.
export const SIZE_STANDARDS: Record<string, { industry: string; basis: "receipts" | "employees"; limit: number }> = {
  "541430": { industry: "Graphic design services", basis: "receipts", limit: 9_000_000 },
  "311811": { industry: "Retail bakeries", basis: "employees", limit: 500 },
  "561720": { industry: "Janitorial services", basis: "receipts", limit: 22_000_000 },
  "713940": { industry: "Fitness and recreational sports centers", basis: "receipts", limit: 17_500_000 },
};

export function wosbRequirements(entity: EntityType, edwosb: boolean): Requirement[] {
  const items: Requirement[] = [
    {
      kind: "answer", id: "wosb_ownership", pass: ["yes"], options: YES_NO,
      question: "Do women who are U.S. citizens living in the U.S. own at least 51% of the business directly?",
      help: "Ownership must be direct and unconditional, not through another company, and women must receive at least 51% of profits. Green card holders don’t count toward the 51%.",
    },
    {
      kind: "answer", id: "wosb_control", pass: ["yes"], options: YES_NO,
      question: "Does a woman hold the highest officer position and run the business day to day?",
      help: "She makes the long-term decisions, manages daily operations, and generally works in the business full time.",
    },
    {
      kind: "answer", id: "wosb_sam", options: YES_NO,
      question: "Is the business registered on SAM.gov?",
      help: "Free, and required to bid on federal contracts. SBA checks your industry codes there.",
    },
    { kind: "ada", id: "business_profile" },
    { kind: "ada", id: "size_check" },
    { kind: "vault", id: "proof_of_citizenship" },
    ...formationDocs(entity),
    { kind: "write", id: "control_statement" },
    {
      kind: "answer", id: "wosb_edwosb", options: YES_NO,
      question: "Also apply as economically disadvantaged (EDWOSB)?",
      help: `Opens more set-aside contracts. Each woman owner needs personal net worth under $${(WOSB.edwosbLimits.netWorth / 1000).toFixed(0)}K (excluding her home, her share of the business and retirement accounts), 3-year average income under $${(WOSB.edwosbLimits.income / 1000).toFixed(0)}K, and total assets under $${(WOSB.edwosbLimits.assets / 1_000_000).toFixed(1)}M.`,
    },
  ];
  if (edwosb) {
    items.push(
      {
        kind: "answer", id: "edwosb_limits", pass: ["yes"], options: YES_NO,
        question: "Is each woman owner under the EDWOSB net worth, income and asset limits?",
      },
      { kind: "vault", id: "personal_financial_statement", note: "Entered in the SBA portal; SBA Form 413 has the same fields" },
      { kind: "vault", id: "personal_tax_returns", note: "The 3 most recent federal returns for each woman claiming disadvantage" },
    );
  }
  return items;
}

// ---- SBA loans ---------------------------------------------------------------------------

export const SBA = {
  microloanMax: 50_000,
  smallLoanMax: 350_000, // 7(a) small loan
  sevenAMax: 5_000_000,
  lenderMatch: "https://www.sba.gov/loans/lender-match/",
};

export function sbaProgram(amount: number) {
  if (amount <= SBA.microloanMax) return { name: "SBA Microloan", detail: "Up to $50,000 for up to 7 years, through a nonprofit intermediary lender" };
  if (amount <= SBA.smallLoanMax) return { name: "SBA 7(a) small loan", detail: "Up to $350,000 through a bank or other SBA lender" };
  return { name: "SBA 7(a) loan", detail: "Up to $5 million through a bank or other SBA lender" };
}

export function sbaRequirements(entity: EntityType, hasDebt: boolean): Requirement[] {
  return [
    {
      kind: "answer", id: "sba_for_profit", pass: ["yes"], options: YES_NO,
      question: "Is the business a for-profit business operating in the U.S.?",
    },
    {
      kind: "answer", id: "sba_citizens", pass: ["yes"], options: YES_NO,
      question: "Are all owners U.S. citizens or U.S. nationals who live in the U.S.?",
      help: "Required for 7(a) loans since March 1, 2026; green card holders no longer qualify.",
    },
    {
      kind: "answer", id: "sba_ineligible", pass: ["no"], options: YES_NO,
      question: "Is the business in lending, passive real estate, gambling, political activity, or another SBA-ineligible field?",
    },
    {
      kind: "answer", id: "sba_equity", pass: ["yes"], options: YES_NO,
      question: "Can you put in at least 10% of the project cost if the business is under a year old?",
      help: "Start-ups need a 10% equity injection. Established businesses: answer yes.",
    },
    { kind: "ada", id: "business_profile" },
    { kind: "ada", id: "statements" },
    { kind: "ada", id: "borrower_summary" },
    { kind: "write", id: "business_description" },
    { kind: "write", id: "use_of_funds" },
    { kind: "vault", id: "photo_id" },
    { kind: "vault", id: "business_tax_returns", note: "3 years; the lender also checks them with the IRS using Form 4506-C" },
    { kind: "vault", id: "personal_tax_returns" },
    { kind: "vault", id: "personal_financial_statement", note: "SBA Form 413 for each owner with 20% or more, signed within 90 days" },
    { kind: "vault", id: "business_license" },
    ...formationDocs(entity),
    ...(hasDebt ? [{ kind: "vault", id: "debt_statements" } as Requirement] : []),
    { kind: "vault", id: "resume", note: "Many lenders ask for one" },
  ];
}

// ---- Applications started from the Funding Finder ----------------------------------------

export function sourceRequirements(type: SourceType, entity: EntityType): Requirement[] {
  switch (type) {
    case "grant":
      return [
        { kind: "ada", id: "business_profile" },
        { kind: "write", id: "business_description" },
        { kind: "write", id: "use_of_funds" },
        { kind: "vault", id: "photo_id" },
      ];
    case "zero_interest_loan":
      return [
        { kind: "ada", id: "business_profile" },
        { kind: "write", id: "business_description" },
        { kind: "write", id: "use_of_funds" },
        { kind: "vault", id: "photo_id" },
        { kind: "vault", id: "business_license" },
      ];
    default:
      return [
        { kind: "ada", id: "business_profile" },
        { kind: "ada", id: "statements" },
        { kind: "write", id: "business_description" },
        { kind: "write", id: "use_of_funds" },
        { kind: "vault", id: "photo_id" },
        { kind: "vault", id: "business_tax_returns" },
        { kind: "vault", id: "personal_tax_returns" },
        { kind: "vault", id: "business_license" },
        ...formationDocs(entity),
      ];
  }
}
