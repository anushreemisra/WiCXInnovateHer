import type { Metadata } from "next";
import { ScoreScreen } from "@/components/score/ScoreScreen";

export const metadata: Metadata = { title: "Fundability Score · Ada Runway" };

export default function ScorePage() {
  return <ScoreScreen />;
}
