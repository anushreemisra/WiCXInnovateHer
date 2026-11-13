// Drafts the short written parts of an application (business description, use of funds,
// who runs the business) from facts Ada already holds. The founder always edits the result.
// Without ANTHROPIC_API_KEY it returns a template draft so the demo still works.

import Anthropic from "@anthropic-ai/sdk";
import { DRAFTS, type DraftId } from "@/lib/apply/requirements.ts";

export interface DraftFacts {
  ownerName: string;
  business: string;
  location: string;
  entityType: string;
  yearsInBusiness: number;
  annualRevenue: number;
  clientCount: number;
  topClientShare: number;
  loanAmount?: number;
  purpose?: string; // what she wants the money for, in her words
}

const SYSTEM = `You draft short sections of small-business funding and certification applications for women business owners.
Write in the first person as the owner, plainly and specifically, in 90-140 words, as one or two paragraphs of plain text (no headings, lists or markdown).
Use only the facts provided. Where a needed detail is missing, write a bracketed placeholder such as [number of new clients] instead of inventing it.`;

const ASK: Record<DraftId, string> = {
  business_description: "Write the business description: what the business does, for whom, how long it has operated, and its scale.",
  use_of_funds: "Write the use-of-funds statement: what the requested money pays for and how that grows revenue or stability. Tie it to the amount and purpose given.",
  control_statement: "Write a statement of who runs the business: how the woman owner makes day-to-day and long-term decisions and holds the top officer role.",
};

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

function factsText(f: DraftFacts) {
  return [
    `Owner: ${f.ownerName}`,
    `Business: ${f.business}, a ${f.entityType} in ${f.location}`,
    `Years in business: ${f.yearsInBusiness.toFixed(1)}`,
    `Revenue, last 12 months: ${money(f.annualRevenue)}`,
    f.clientCount > 0 ? `Invoiced clients: ${f.clientCount}; biggest is ${Math.round(f.topClientShare * 100)}% of revenue` : "Sales are spread across many walk-in or membership customers",
    f.loanAmount ? `Amount requested: ${money(f.loanAmount)}` : null,
    f.purpose ? `Purpose, in her words: ${f.purpose}` : null,
  ].filter(Boolean).join("\n");
}

function template(id: DraftId, f: DraftFacts): string {
  const years = f.yearsInBusiness >= 1 ? `${Math.floor(f.yearsInBusiness)} years` : "less than a year";
  switch (id) {
    case "business_description":
      return `I founded and run ${f.business}, a ${f.entityType} based in ${f.location}. Over ${years} the business has grown to ${money(f.annualRevenue)} in revenue over the last 12 months${f.clientCount > 0 ? `, serving ${f.clientCount} invoiced clients` : ""}. [Describe what you sell and who your typical customer is.]`;
    case "use_of_funds":
      return `I am requesting ${f.loanAmount ? money(f.loanAmount) : "[amount]"} to ${f.purpose || "[what the money pays for]"}. This will let the business [expected result, e.g. take on more clients], building on ${money(f.annualRevenue)} in revenue over the last 12 months. [Add a simple breakdown of how the money will be spent.]`;
    case "control_statement":
      return `I, ${f.ownerName}, own the business and hold its highest officer position. I make the day-to-day decisions, including pricing, hiring and client work, and set its long-term direction. [Name anyone else involved and confirm they report to you.]`;
  }
}

export async function POST(req: Request) {
  const { id, facts } = (await req.json()) as { id: DraftId; facts: DraftFacts };
  if (!(id in DRAFTS) || !facts?.business) {
    return Response.json({ error: "Unknown draft or missing facts" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ text: template(id, facts), source: "template" });
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" }, // short, fact-bound drafting
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `${ASK[id]}\n\nFacts:\n${factsText(facts)}` }],
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ text: template(id, facts), source: "template" });
    }
    const text = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    return Response.json({ text: text || template(id, facts), source: text ? "ai" : "template" });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "The writing helper is busy. Try again in a minute." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Draft API error ${error.status}:`, error.message);
      return Response.json({ text: template(id, facts), source: "template" });
    }
    throw error;
  }
}
