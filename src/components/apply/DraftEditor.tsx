"use client";

import { useState } from "react";
import type { DraftFacts } from "@/app/api/draft/route";
import { DRAFTS, type DraftId } from "@/lib/apply/requirements.ts";
import { useWorkspace } from "../Workspace";

/** Extra facts a page adds to what Ada knows (e.g. the loan amount on the SBA page). */
export type DraftContext = Pick<DraftFacts, "loanAmount" | "purpose">;

export function DraftEditor({ id, context }: { id: DraftId; context: DraftContext }) {
  const { business, metrics, data, drafts, setDraft } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const text = drafts[id] ?? "";

  async function draft() {
    setBusy(true);
    setNote(null);
    const facts: DraftFacts = {
      ownerName: business.name,
      business: business.business,
      location: business.location,
      entityType: data.profile.entityType.replace("_", " "),
      yearsInBusiness: metrics.yearsInBusiness,
      annualRevenue: metrics.annualRevenue,
      clientCount: new Set(data.invoices.map((i) => i.client)).size,
      topClientShare: metrics.topClientShare,
      ...context,
    };
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, facts }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Drafting failed");
      setDraft(id, body.text);
      setNote(body.source === "ai"
        ? "AI draft from your Ada data. Check it and fill any [brackets]."
        : "Template draft (no AI key set). Fill the [brackets].");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Drafting failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">{DRAFTS[id].hint}</p>
      <textarea
        value={text}
        onChange={(e) => setDraft(id, e.target.value)}
        rows={text ? 5 : 2}
        placeholder="Write it yourself, or start from a draft"
        aria-label={DRAFTS[id].label}
        className="w-full rounded-lg border border-line bg-paper p-3 text-sm leading-relaxed text-ink"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={draft}
          disabled={busy}
          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-ink-soft disabled:opacity-60"
        >
          {busy ? "Drafting…" : text ? "Redraft from my data" : "Draft from my Ada data"}
        </button>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
    </div>
  );
}
