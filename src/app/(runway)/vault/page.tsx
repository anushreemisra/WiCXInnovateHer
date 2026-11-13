import type { Metadata } from "next";
import { VaultScreen } from "@/components/apply/VaultScreen";

export const metadata: Metadata = { title: "Document vault · Ada Runway" };

export default function VaultPage() {
  return <VaultScreen />;
}
