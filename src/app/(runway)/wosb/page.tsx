import type { Metadata } from "next";
import { WosbScreen } from "@/components/apply/WosbScreen";

export const metadata: Metadata = { title: "WOSB certification · Ada Runway" };

export default function WosbPage() {
  return <WosbScreen />;
}
