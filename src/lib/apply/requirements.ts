// The application engine's building blocks. Every toolkit (WOSB, SBA, and each application
// started from the Funding Finder) is just a different list of requirements over the same
// vault, the same Ada-built documents, and the same drafts.

import type { EntityType } from "../ada/types.ts";

// Documents she uploads once and reuses everywhere.
export const DOCUMENTS = {
  proof_of_citizenship: { label: "Proof of U.S. citizenship", hint: "Passport or birth certificate for each woman owner" },
  photo_id: { label: "Photo ID", hint: "Driver’s license or passport" },
  business_tax_returns: { label: "Business tax returns (3 years)", hint: "Or Schedule C if she files as a sole proprietor", howTo: "Ask your accountant, or request transcripts at irs.gov/transcripts" },
  personal_tax_returns: { label: "Personal tax returns (3 years)", hint: "All pages and schedules", howTo: "Download transcripts free at irs.gov/transcripts" },
  business_license: { label: "Business license", hint: "City or county license" },
  assumed_name: { label: "Assumed name (DBA) certificate", hint: "If the business uses a name other than the owner’s" },
  articles_of_organization: { label: "Articles of organization", hint: "Filed with the state when the LLC was formed" },
  operating_agreement: { label: "Operating agreement", hint: "Shows who owns and controls the LLC" },
  articles_of_incorporation: { label: "Articles of incorporation", hint: "Filed with the state when the corporation was formed" },
  bylaws: { label: "Corporate bylaws", hint: "And any amendments" },
  stock_records: { label: "Stock certificates and ledger", hint: "Every certificate issued, front and back, plus the stock ledger" },
  partnership_agreement: { label: "Partnership agreement", hint: "Shows each partner’s share and role" },
  voting_agreements: { label: "Voting agreements", hint: "Any agreements on how shares are voted" },
  personal_financial_statement: { label: "Personal financial statement (SBA Form 413)", hint: "Assets, debts and income of each owner", howTo: "Free fillable form at sba.gov (search “SBA Form 413”)" },
  lease: { label: "Business lease", hint: "If she rents space" },
  resume: { label: "Owner résumé", hint: "Shows management experience" },
  debt_statements: { label: "Statements for existing loans", hint: "Balance, rate and payment for each" },
} as const;
export type DocId = keyof typeof DOCUMENTS;

// Things she writes once, with an AI first draft built from her Ada data.
export const DRAFTS = {
  business_description: { label: "Business description", hint: "What you do, for whom, and how long you’ve done it" },
  use_of_funds: { label: "Use of funds", hint: "What the money pays for and how it grows revenue" },
  control_statement: { label: "Who runs the business", hint: "How the woman owner makes day-to-day and long-term decisions" },
} as const;
export type DraftId = keyof typeof DRAFTS;

// Documents Runway builds from Ada data.
export const ADA_BUILT = {
  statements: { label: "Profit and loss, cash and debt summary (12 months)", hint: "Built from Ada transactions and invoices" },
  borrower_summary: { label: "Borrower information summary", hint: "Organised like SBA Form 1919" },
  size_check: { label: "Small-business size check", hint: "Compared with SBA’s size limit for your industry" },
  business_profile: { label: "Business details", hint: "Name, type, industry, location, founding date from Ada" },
} as const;
export type AdaBuiltId = keyof typeof ADA_BUILT;

export type Requirement =
  | { kind: "ada"; id: AdaBuiltId }
  | { kind: "vault"; id: DocId; note?: string }
  | { kind: "write"; id: DraftId }
  | { kind: "answer"; id: string; question: string; help?: string; options: { value: string; label: string }[]; pass?: string[] };

export function formationDocs(entity: EntityType): Requirement[] {
  switch (entity) {
    case "sole_proprietorship":
      return [{ kind: "vault", id: "assumed_name", note: "Your trade name (DBA) certificate" }];
    case "partnership":
      return [{ kind: "vault", id: "partnership_agreement" }];
    case "llc":
      return [{ kind: "vault", id: "articles_of_organization" }, { kind: "vault", id: "operating_agreement" }];
    case "corporation":
      return [
        { kind: "vault", id: "articles_of_incorporation" }, { kind: "vault", id: "bylaws" },
        { kind: "vault", id: "stock_records" }, { kind: "vault", id: "voting_agreements", note: "If any exist" },
      ];
  }
}

export const ENTITY_LABEL: Record<EntityType, string> = {
  sole_proprietorship: "Sole proprietorship",
  partnership: "Partnership",
  llc: "LLC",
  corporation: "Corporation",
};
