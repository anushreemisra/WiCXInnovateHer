"use client";

// The demo business being viewed, plus what the founder has added in Runway: documents in her
// vault and answers to toolkit questions. Shared by every page so a document uploaded once shows
// up in every application. Saved in this browser only (localStorage), per demo business.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AS_OF, DEMO_BUSINESSES, generate, type BusinessParams, type DemoBusinessKey } from "@/lib/ada/demo-businesses.ts";
import type { AdaData } from "@/lib/ada/types.ts";
import { computeMetrics, score, type Metrics, type ScoreResult } from "@/lib/fundability/engine.ts";

export interface VaultEntry {
  fileName: string;
  addedAt: string;
}

export type Answers = Record<string, string>;

interface WorkspaceValue {
  businessKey: DemoBusinessKey;
  setBusinessKey: (k: DemoBusinessKey) => void;
  business: BusinessParams;
  data: AdaData;
  metrics: Metrics;
  result: ScoreResult;
  vault: Record<string, VaultEntry>;
  addDocument: (docId: string, fileName: string) => void;
  removeDocument: (docId: string) => void;
  answers: Answers;
  setAnswer: (id: string, value: string) => void;
  drafts: Record<string, string>;
  setDraft: (id: string, text: string) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

interface Saved {
  vault: Record<string, VaultEntry>;
  answers: Answers;
  drafts: Record<string, string>;
}
const EMPTY: Saved = { vault: {}, answers: {}, drafts: {} };

function load(key: string): Saved {
  try {
    const raw = localStorage.getItem(`runway:${key}`);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(key: string, value: Saved) {
  try {
    localStorage.setItem(`runway:${key}`, JSON.stringify(value));
  } catch {
    // Private windows can block storage; the demo still works for this visit.
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [businessKey, setKey] = useState<DemoBusinessKey>("maya");
  const [saved, setSaved] = useState<Saved>(EMPTY);

  // Restore the last business viewed and its saved state after hydration.
  useEffect(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem("runway:business");
    } catch {}
    const key = last && last in DEMO_BUSINESSES ? (last as DemoBusinessKey) : "maya";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
    setKey(key);
    setSaved(load(key));
  }, []);

  const setBusinessKey = useCallback((k: DemoBusinessKey) => {
    setKey(k);
    setSaved(load(k));
    try {
      localStorage.setItem("runway:business", k);
    } catch {}
  }, []);

  const update = useCallback(
    (fn: (s: Saved) => Saved) =>
      setSaved((s) => {
        const next = fn(s);
        save(businessKey, next);
        return next;
      }),
    [businessKey],
  );

  const business = DEMO_BUSINESSES[businessKey];
  const data = useMemo(() => generate(business), [business]);
  const metrics = useMemo(() => computeMetrics(data, AS_OF), [data]);
  const result = useMemo(() => score(metrics), [metrics]);

  const value: WorkspaceValue = {
    businessKey, setBusinessKey, business, data, metrics, result,
    vault: saved.vault,
    addDocument: (docId, fileName) =>
      update((s) => ({ ...s, vault: { ...s.vault, [docId]: { fileName, addedAt: new Date().toISOString() } } })),
    removeDocument: (docId) =>
      update((s) => {
        const vault = { ...s.vault };
        delete vault[docId];
        return { ...s, vault };
      }),
    answers: saved.answers,
    setAnswer: (id, v) => update((s) => ({ ...s, answers: { ...s.answers, [id]: v } })),
    drafts: saved.drafts,
    setDraft: (id, text) => update((s) => ({ ...s, drafts: { ...s.drafts, [id]: text } })),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
