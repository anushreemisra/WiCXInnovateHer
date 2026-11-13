"use client";

import Link from "next/link";
import { sourceRequirements } from "@/lib/apply/programs.ts";
import { TYPE_LABEL } from "@/lib/funding/rank.ts";
import { SOURCES } from "@/lib/funding/sources.ts";
import { useWorkspace } from "../Workspace";
import { useAdaBuilt } from "./AdaBuilt";
import { SideCard, ToolkitLayout } from "./ToolkitLayout";

export function ApplyScreen({ id }: { id: string }) {
  const { data, answers, setAnswer } = useWorkspace();
  const renderAda = useAdaBuilt();
  const source = SOURCES.find((s) => s.id === id);
  if (!source) {
    return (
      <p>
        That funding source isn’t in the list. <Link href="/finder" className="underline">Back to the Funding Finder</Link>
      </p>
    );
  }
  const purposeKey = `purpose_${source.id}`;
  const purpose = answers[purposeKey] ?? "";

  return (
    <ToolkitLayout
      eyebrow={`Application · ${TYPE_LABEL[source.type]}`}
      title={source.name}
      intro={
        <>
          {source.summary} This is the typical package for this kind of funding; {source.name} confirms its exact list when you apply.
        </>
      }
      items={sourceRequirements(source.type, data.profile.entityType)}
      renderAda={renderAda}
      draftContext={{ purpose, loanAmount: source.amountMax ?? undefined }}
      aside={
        <>
          <SideCard title="What it’s for">
            <input
              value={purpose}
              onChange={(e) => setAnswer(purposeKey, e.target.value)}
              placeholder="e.g. buy a second oven"
              aria-label="What the money is for"
              className="rounded-lg border border-line bg-paper px-3 py-2 text-ink"
            />
            <p>Used in your use-of-funds draft.</p>
          </SideCard>
          <SideCard title="When you’re ready">
            {source.eligibility && <p>Eligibility: {source.eligibility}</p>}
            <a href={source.url} target="_blank" rel="noreferrer" className="w-fit rounded-lg bg-ink px-3 py-1.5 font-medium text-paper hover:bg-ink-soft">
              Apply on their site ↗
            </a>
            <Link href="/finder" className="text-ink underline">Back to the Funding Finder</Link>
          </SideCard>
        </>
      }
    />
  );
}
