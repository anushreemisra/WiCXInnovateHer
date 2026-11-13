import type { Metadata } from "next";
import { SbaScreen } from "@/components/apply/SbaScreen";

export const metadata: Metadata = { title: "SBA loan toolkit · Ada Runway" };

export default function SbaPage() {
  return <SbaScreen />;
}
