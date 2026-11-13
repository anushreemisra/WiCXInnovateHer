"use client";

import { sbaRequirements, sourceRequirements, wosbRequirements } from "@/lib/apply/programs.ts";
import { DOCUMENTS, type DocId, type Requirement } from "@/lib/apply/requirements.ts";
import { useWorkspace } from "../Workspace";
import { UploadButton } from "./Checklist";

export function VaultScreen() {
  const { data, vault, removeDocument } = useWorkspace();
  const entity = data.profile.entityType;
  const uses: [string, Requirement[]][] = [
    ["WOSB", wosbRequirements(entity, true)],
    ["SBA loan", sbaRequirements(entity, true)],
    ["Community lenders", sourceRequirements("cdfi", entity)],
    ["Grants", sourceRequirements("grant", entity)],
  ];
  const usedBy = (id: DocId) => uses.filter(([, items]) => items.some((r) => r.kind === "vault" && r.id === id)).map(([n]) => n);
  const docs = (Object.keys(DOCUMENTS) as DocId[]).filter((id) => usedBy(id).length > 0);
  const stored = docs.filter((id) => vault[id]).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Document vault</p>
        <h1 className="text-3xl font-semibold tracking-tight">Upload once, reuse in every application</h1>
        <p className="mt-1 text-ink-soft">
          {stored} of {docs.length} documents stored. Each one fills its line in every toolkit automatically. (Demo: only the file name is kept, in this browser.)
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {docs.map((id) => {
          const entry = vault[id];
          return (
            <li key={id} className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{DOCUMENTS[id].label}</p>
                <p className="text-sm text-muted">Used in: {usedBy(id).join(" · ")}</p>
              </div>
              {entry ? (
                <p className="text-sm">
                  {entry.fileName}{" "}
                  <button onClick={() => removeDocument(id)} className="text-xs text-accent underline">remove</button>
                </p>
              ) : (
                <UploadButton docId={id} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
