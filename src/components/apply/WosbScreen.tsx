"use client";

import { WOSB, wosbRequirements } from "@/lib/apply/programs.ts";
import { ENTITY_LABEL } from "@/lib/apply/requirements.ts";
import { useWorkspace } from "../Workspace";
import { useAdaBuilt } from "./AdaBuilt";
import { SideCard, ToolkitLayout } from "./ToolkitLayout";

export function WosbScreen() {
  const { data, answers } = useWorkspace();
  const items = wosbRequirements(data.profile.entityType, answers.wosb_edwosb === "yes");
  const renderAda = useAdaBuilt();

  return (
    <ToolkitLayout
      eyebrow="WOSB certification · on for every account"
      title="Get certified as a women-owned small business"
      intro={
        <>
          Certification lets you bid on federal contracts set aside for women-owned small businesses. The government’s goal is{" "}
          {WOSB.contractingGoal} of contract dollars. Your checklist below is set up for your business type: {ENTITY_LABEL[data.profile.entityType]}.
        </>
      }
      items={items}
      renderAda={renderAda}
      draftContext={{}}
      aside={
        <>
          <SideCard title="When you’re ready">
            <p>Applying through SBA is free; SBA aims to decide within 90 days. Submit on {WOSB.portal.name} and upload the documents from your vault.</p>
            <a href={WOSB.portal.url} target="_blank" rel="noreferrer" className="w-fit rounded-lg bg-ink px-3 py-1.5 font-medium text-paper hover:bg-ink-soft">
              Open {WOSB.portal.name} ↗
            </a>
          </SideCard>
          <SideCard title="Why it’s worth it">
            <p>Certification isn’t required to run a business. It opens contracts that only women-owned firms can bid on, which means new revenue, not new debt.</p>
            <p>
              Certification lasts {WOSB.yearsValid} years. Runway reminds you to update SAM.gov each year and to recertify in the 90 days before it ends.
            </p>
          </SideCard>
        </>
      }
    />
  );
}
