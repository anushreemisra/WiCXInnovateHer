import type { Metadata } from "next";
import { FinderScreen } from "@/components/finder/FinderScreen";

export const metadata: Metadata = { title: "Funding Finder · Ada Runway" };

export default function FinderPage() {
  return <FinderScreen />;
}
