"use client";

import { useState } from "react";
import { ADA_BUILT, DOCUMENTS, DRAFTS, type Requirement } from "@/lib/apply/requirements.ts";
import { useWorkspace } from "../Workspace";
import { DraftEditor, type DraftContext } from "./DraftEditor";

export type Status = "ready" | "todo" | "blocked";

export function requirementStatus(r: Requirement, ws: ReturnType<typeof useWorkspace>): Status {
  switch (r.kind) {
    case "ada":
      return "ready";
    case "vault":
      return ws.vault[r.id] ? "ready" : "todo";
    case "write":
      return (ws.drafts[r.id]?.trim().length ?? 0) >= 40 ? "ready" : "todo";
    case "answer": {
      const v = ws.answers[r.id];
      if (!v) return "todo";
      return r.pass && !r.pass.includes(v) ? "blocked" : "ready";
    }
  }
}

const SOURCE_LABEL: Record<Requirement["kind"], string> = {
  ada: "Filled from Ada",
  vault: "From your vault",
  write: "You write it (AI draft)",
  answer: "Quick question",
};

export function ChecklistSummary({ items }: { items: Requirement[] }) {
  const ws = useWorkspace();
  const statuses = items.map((r) => requirementStatus(r, ws));
  const ready = statuses.filter((s) => s === "ready").length;
  const fromAda = items.filter((r) => r.kind === "ada").length;
  const blocked = statuses.includes("blocked");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-lg font-semibold">{ready} of {items.length} ready</p>
        <p className="text-sm text-muted">{fromAda} filled automatically from Ada</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={ready} aria-valuemin={0} aria-valuemax={items.length}>
        <div className={`h-full rounded-full transition-[width] duration-500 ${blocked ? "bg-accent" : "bg-ink"}`} style={{ width: `${(ready / items.length) * 100}%` }} />
      </div>
      {blocked && <p className="text-sm font-medium text-accent">One of your answers doesn’t meet the eligibility rules. See below.</p>}
    </div>
  );
}

export function Checklist({ items, renderAda, draftContext }: {
  items: Requirement[];
  renderAda?: (id: Extract<Requirement, { kind: "ada" }>["id"]) => React.ReactNode;
  draftContext: DraftContext;
}) {
  const ws = useWorkspace();
  return (
    <ol className="flex flex-col gap-2">
      {items.map((r) => {
        const status = requirementStatus(r, ws);
        return (
          <li key={`${r.kind}:${r.id}`} className={`rounded-xl border bg-card p-4 ${status === "blocked" ? "border-accent/50" : "border-line"}`}>
            <div className="flex items-start gap-3">
              <StatusDot status={status} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-medium">{title(r)}</p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">{SOURCE_LABEL[r.kind]}</span>
                </div>
                <Body r={r} renderAda={renderAda} draftContext={draftContext} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function title(r: Requirement) {
  switch (r.kind) {
    case "ada": return ADA_BUILT[r.id].label;
    case "vault": return DOCUMENTS[r.id].label;
    case "write": return DRAFTS[r.id].label;
    case "answer": return r.question;
  }
}

function StatusDot({ status }: { status: Status }) {
  const style = { ready: "bg-ink text-paper", todo: "border-2 border-line text-transparent", blocked: "bg-accent text-paper" }[status];
  const label = { ready: "Ready", todo: "To do", blocked: "Not eligible" }[status];
  return (
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style}`} title={label}>
      <span aria-hidden="true">{status === "blocked" ? "!" : "✓"}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Body({ r, renderAda, draftContext }: {
  r: Requirement;
  renderAda?: (id: Extract<Requirement, { kind: "ada" }>["id"]) => React.ReactNode;
  draftContext: DraftContext;
}) {
  const ws = useWorkspace();
  switch (r.kind) {
    case "ada":
      return (
        <>
          <p className="text-sm text-ink-soft">{ADA_BUILT[r.id].hint}</p>
          {renderAda?.(r.id)}
        </>
      );
    case "vault": {
      const doc = DOCUMENTS[r.id];
      const entry = ws.vault[r.id];
      return (
        <>
          <p className="text-sm text-ink-soft">{r.note ?? doc.hint}</p>
          {"howTo" in doc && !entry && <p className="text-xs text-muted">Where to get it: {doc.howTo}</p>}
          {entry ? (
            <p className="text-sm">
              <span className="font-medium">{entry.fileName}</span>
              <span className="text-muted"> · in your vault, reused in every application</span>{" "}
              <button onClick={() => ws.removeDocument(r.id)} className="text-xs text-accent underline">remove</button>
            </p>
          ) : (
            <UploadButton docId={r.id} />
          )}
        </>
      );
    }
    case "write":
      return <DraftEditor id={r.id} context={draftContext} />;
    case "answer": {
      const value = ws.answers[r.id];
      return (
        <>
          {r.help && <p className="text-sm text-ink-soft">{r.help}</p>}
          <div className="flex flex-wrap gap-2 pt-1" role="radiogroup" aria-label={r.question}>
            {r.options.map((o) => (
              <button
                key={o.value}
                role="radio"
                aria-checked={value === o.value}
                onClick={() => ws.setAnswer(r.id, o.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${value === o.value ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      );
    }
  }
}

export function UploadButton({ docId }: { docId: keyof typeof DOCUMENTS }) {
  const { addDocument } = useWorkspace();
  const [id] = useState(() => `upload-${docId}`);
  return (
    <label htmlFor={id} className="mt-1 inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-ink px-3 py-1.5 text-sm font-medium hover:bg-paper">
      Add to vault
      <input
        id={id}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) addDocument(docId, f.name);
        }}
      />
    </label>
  );
}
