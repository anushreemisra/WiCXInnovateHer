"use client";

import Link from "next/link";
import { SBA, sbaProgram, sbaRequirements } from "@/lib/apply/programs.ts";
import { useWorkspace } from "../Workspace";
import { useAdaBuilt } from "./AdaBuilt";
import { SideCard, ToolkitLayout } from "./ToolkitLayout";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function SbaScreen() {
  const { data, metrics, result, answers, setAnswer } = useWorkspace();
  // Default the request to what she could borrow, capped at the microloan limit to start small.
  const fallbackAmount = Math.max(5000, Math.min(result.capacity || 25_000, SBA.microloanMax));
  const amount = Number(answers.sba_amount) || fallbackAmount;
  const purpose = answers.sba_purpose ?? "";
  const program = sbaProgram(amount);
  const items = sbaRequirements(data.profile.entityType, metrics.annualDebt > 0);
  const renderAda = useAdaBuilt({ amount, program: program.name });
  const overCapacity = amount > result.capacity;

  return (
    <ToolkitLayout
      eyebrow="SBA loan toolkit · on for every account"
      title="Get ready for an SBA-backed loan"
      intro="SBA doesn’t lend directly: banks and nonprofit lenders do, with an SBA guarantee. Arrive with a complete package and skip the back-and-forth."
      items={items}
      renderAda={renderAda}
      draftContext={{ loanAmount: amount, purpose }}
      aside={
        <>
          <SideCard title="Your request">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-ink">Amount</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={amount}
                onChange={(e) => setAnswer("sba_amount", e.target.value)}
                className="rounded-lg border border-line bg-paper px-3 py-2 text-ink"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-ink">What it’s for</span>
              <input
                value={purpose}
                onChange={(e) => setAnswer("sba_purpose", e.target.value)}
                placeholder="e.g. hire a part-time designer"
                className="rounded-lg border border-line bg-paper px-3 py-2 text-ink"
              />
            </label>
            <p>
              Program: <b className="text-ink">{program.name}</b>. {program.detail}.
            </p>
            <p className={overCapacity ? "text-accent" : ""}>
              Your Fundability Score estimates you could borrow up to {money(result.capacity)}.
              {overCapacity && " This request is above that, so expect lenders to ask how you’ll repay it."}
            </p>
          </SideCard>
          <SideCard title="When you’re ready">
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
        </>
      }
    />
  );
}
