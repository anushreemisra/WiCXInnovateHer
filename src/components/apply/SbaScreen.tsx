"use client";

import Link from "next/link";
import { SBA, sbaProgram, sbaRequirements } from "@/lib/apply/programs.ts";
import { useWorkspace } from "../Workspace";
import { useAdaBuilt } from "./AdaBuilt";
import { SideCard, ToolkitLayout } from "./ToolkitLayout";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function SbaScreen() {
  const { data, metrics, result } = useWorkspace();
  // The request is sized to what her books support; the lender settles the final amount.
  const amount = Math.max(5000, Math.floor(result.capacity / 1000) * 1000);
  const program = sbaProgram(amount);
  const items = sbaRequirements(data.profile.entityType, metrics.annualDebt > 0);
  const renderAda = useAdaBuilt({ amount, program: program.name });

  return (
    <ToolkitLayout
      eyebrow="SBA loan toolkit · on for every account"
      title="Get ready for an SBA-backed loan"
      intro="SBA doesn’t lend directly: banks and nonprofit lenders do, with an SBA guarantee. Arrive with a complete package and skip the back-and-forth."
      items={items}
      renderAda={renderAda}
      draftContext={{ loanAmount: amount }}
      aside={
        <SideCard title="When you’re ready">
          {result.capacity > 0 ? (
            <p>
              Your books support up to about {money(amount)}, which points to an <b className="text-ink">{program.name}</b> (
              {program.detail.charAt(0).toLowerCase() + program.detail.slice(1)}).
            </p>
          ) : (
            <p>Your books don’t support loan payments yet. Grants, 0% loans and free advising in the Funding Finder come first.</p>
          )}
          <p>Send the same package to SBA’s free Lender Match, or to an SBA lender near you from the Funding Finder.</p>
          <div className="flex flex-wrap gap-2">
            <a href={SBA.lenderMatch} target="_blank" rel="noreferrer" className="rounded-lg bg-ink px-3 py-1.5 font-medium text-paper hover:bg-ink-soft">
              SBA Lender Match ↗
            </a>
            <Link href="/finder" className="rounded-lg border border-line px-3 py-1.5 font-medium text-ink hover:border-ink">
              Lenders near you
            </Link>
          </div>
        </SideCard>
      }
    />
  );
}
