"use client";

// What each "Filled from Ada" checklist line shows: a generated document to download, or the
// result of a check run on her Ada data.

import { useState } from "react";
import { ENTITY_LABEL, type AdaBuiltId } from "@/lib/apply/requirements.ts";
import { SIZE_STANDARDS } from "@/lib/apply/programs.ts";
import { borrowerSummaryPdf, downloadPdf, statementsPdf } from "@/lib/apply/pdf.ts";
import { buildStatements } from "@/lib/apply/statements.ts";
import { useWorkspace } from "../Workspace";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function useAdaBuilt(loan?: { amount: number; program: string }) {
  const ws = useWorkspace();
  const { business, data, metrics, drafts } = ws;
  const [busy, setBusy] = useState(false);
  const slug = business.name.toLowerCase();

  async function run(make: () => Promise<Uint8Array>, file: string) {
    setBusy(true);
    try {
      downloadPdf(await make(), file);
    } finally {
      setBusy(false);
    }
  }

  return function renderAdaBuilt(id: AdaBuiltId): React.ReactNode {
    switch (id) {
      case "business_profile":
        return (
          <p className="text-sm">
            {business.business} · {ENTITY_LABEL[data.profile.entityType]} · {business.location} · founded{" "}
            {new Date(business.founded).getUTCFullYear()} · NAICS {business.naics}
          </p>
        );
      case "size_check": {
        const std = SIZE_STANDARDS[business.naics];
        if (!std) return <p className="text-sm text-muted">No size standard on file for NAICS {business.naics}.</p>;
        if (std.basis === "employees") {
          return (
            <p className="text-sm font-medium text-blue">
              SBA sizes {std.industry.toLowerCase()} by headcount: under {std.limit} employees. Confirm yours; Ada shows a small team.
            </p>
          );
        }
        const ok = metrics.annualRevenue <= std.limit;
        return (
          <>
            <p className={`text-sm font-medium ${ok ? "text-blue" : "text-accent"}`}>
              {ok ? "Passes" : "Over the limit"}: {money(metrics.annualRevenue)} a year vs SBA’s {money(std.limit)} limit for {std.industry.toLowerCase()}
            </p>
            <p className="text-xs text-muted">SBA averages receipts over 5 years; Ada checked the last 12 months.</p>
          </>
        );
      }
      case "statements":
        return (
          <button
            disabled={busy}
            onClick={() => run(() => statementsPdf(`${business.name} · ${business.business}`, buildStatements(data)), `${slug}-financial-statements.pdf`)}
            className="mt-1 w-fit rounded-lg border border-ink px-3 py-1.5 text-sm font-medium hover:bg-paper disabled:opacity-60"
          >
            Download PDF
          </button>
        );
      case "borrower_summary":
        return (
          <button
            disabled={busy || !loan}
            onClick={() =>
              loan &&
              run(
                () =>
                  borrowerSummaryPdf({
                    businessName: business.business,
                    ownerName: business.name,
                    entityType: ENTITY_LABEL[data.profile.entityType],
                    naics: business.naics,
                    location: business.location,
                    founded: business.founded,
                    ownership: `${business.name}, 100%`,
                    loanAmount: loan.amount,
                    loanProgram: loan.program,
                    useOfFunds: drafts.use_of_funds ?? "",
                    businessDescription: drafts.business_description ?? "",
                    statements: buildStatements(data),
                  }),
                `${slug}-borrower-summary.pdf`,
              )
            }
            className="mt-1 w-fit rounded-lg border border-ink px-3 py-1.5 text-sm font-medium hover:bg-paper disabled:opacity-60"
          >
            Download PDF
          </button>
        );
    }
  };
}
