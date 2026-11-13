import type { Requirement } from "@/lib/apply/requirements.ts";
import { Checklist, ChecklistSummary } from "./Checklist";
import type { DraftContext } from "./DraftEditor";

export function ToolkitLayout({ eyebrow, title, intro, items, renderAda, draftContext, aside }: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  items: Requirement[];
  renderAda: (id: Extract<Requirement, { kind: "ada" }>["id"]) => React.ReactNode;
  draftContext: DraftContext;
  aside: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-1 text-ink-soft">{intro}</div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-card p-5">
            <ChecklistSummary items={items} />
          </div>
          <Checklist items={items} renderAda={renderAda} draftContext={draftContext} />
        </section>
        <aside className="flex flex-col gap-4">{aside}</aside>
      </div>
    </div>
  );
}

export function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm text-ink-soft">{children}</div>
    </div>
  );
}
