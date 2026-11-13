import type { Metadata } from "next";
import { ApplyScreen } from "@/components/apply/ApplyScreen";
import { SOURCES } from "@/lib/funding/sources.ts";

export function generateStaticParams() {
  return SOURCES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const source = SOURCES.find((s) => s.id === id);
  return { title: `${source?.name ?? "Application"} · Ada Runway` };
}

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplyScreen id={id} />;
}
