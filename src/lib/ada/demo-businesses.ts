// Synthetic businesses, generated as raw Ada records (transactions + invoices), not as finished
// metrics. The score engine has to work everything out from the raw records, just as it would
// for a real customer.

import type { AdaData, Invoice, Transaction, TransactionType } from "./types.ts";

export const AS_OF = "2026-11-01";

export interface BusinessParams {
  name: string;
  business: string;
  location: string;
  founded: string;
  months: number; // months of history to generate
  revenue: number; // monthly revenue at the start of the history
  growth: number; // monthly growth rate
  seasonality: number; // ± swing over the year
  clients: number[]; // relative revenue shares of invoiced clients
  invoicedShare: number; // share of revenue that is invoiced (rest is card/cash sales)
  payDelay: number; // average days from invoice to payment
  opex: number; // monthly business costs
  debt: number; // monthly loan payments
  ownerDraw: number; // monthly owner pay
  startBalance: number;
  personal: number; // share of spending from the business account that is personal
}

export const DEMO_BUSINESSES = {
  maya: {
    name: "Maya", business: "Brand design studio (solo)", location: "Oakland, CA",
    founded: "2022-09-01", months: 18, revenue: 15000, growth: 0.015, seasonality: 0.08,
    clients: [0.65, 0.1, 0.1, 0.05, 0.05, 0.05], invoicedShare: 1, payDelay: 42,
    opex: 5500, debt: 0, ownerDraw: 9500, startBalance: 3000, personal: 0.15,
  },
  priya: {
    name: "Priya", business: "Bakery with catering", location: "Austin, TX",
    founded: "2025-05-01", months: 18, revenue: 26000, growth: 0.005, seasonality: 0.2,
    clients: [0.06, 0.04], invoicedShare: 0.1, payDelay: 20,
    opex: 21000, debt: 1400, ownerDraw: 2500, startBalance: 8000, personal: 0.02,
  },
  dana: {
    name: "Dana", business: "Home cleaning service", location: "Atlanta, GA",
    founded: "2019-03-01", months: 18, revenue: 8000, growth: 0, seasonality: 0.05,
    clients: Array(25).fill(1 / 25), invoicedShare: 1, payDelay: 10,
    opex: 2400, debt: 0, ownerDraw: 4800, startBalance: 9000, personal: 0.25,
  },
  lena: {
    name: "Lena", business: "Fitness studio (opened this year)", location: "Brooklyn, NY",
    founded: "2026-01-01", months: 10, revenue: 6000, growth: 0.08, seasonality: 0.05,
    clients: [], invoicedShare: 0, payDelay: 0,
    opex: 11000, debt: 600, ownerDraw: 0, startBalance: 40000, personal: 0,
  },
} satisfies Record<string, BusinessParams>;

export type DemoBusinessKey = keyof typeof DEMO_BUSINESSES;

// Deterministic "random" number for a given seed and label, so a what-if change to one input
// never reshuffles the noise on the others.
function rand(seed: number, label: string) {
  let h = 2166136261 ^ seed;
  for (const ch of label) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h >>> 0) % 100000) / 100000;
}

export function generate(p: BusinessParams, seed = 7): AdaData {
  const noise = (amt: number, label: string) => 1 + (rand(seed, label) - 0.5) * 2 * amt;
  const transactions: Transaction[] = [];
  const invoices: Invoice[] = [];
  let balance = p.startBalance;
  const end = new Date(AS_OF);
  const totalShare = p.clients.reduce((a, b) => a + b, 0);

  for (let i = p.months; i >= 1; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    const ym = d.toISOString().slice(0, 7);
    const monthIndex = p.months - i;
    const season = 1 + p.seasonality * Math.sin((d.getUTCMonth() / 12) * 2 * Math.PI);
    const revenue = p.revenue * (1 + p.growth) ** monthIndex * season * noise(0.1, `rev${ym}`);
    const tx = (day: number, type: TransactionType, amount: number, extra: Partial<Transaction> = {}) => {
      balance += amount;
      transactions.push({
        date: `${ym}-${String(day).padStart(2, "0")}`, type, amount: Math.round(amount),
        balance: Math.round(balance), ...extra,
      });
    };

    // Invoiced client work (paid after a delay) and card/cash sales (paid on the spot)
    p.clients.forEach((share, c) => {
      const amount = Math.round(revenue * p.invoicedShare * (share / totalShare));
      const issued = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 3));
      const paid = new Date(issued.getTime() + p.payDelay * noise(0.4, `pay${ym}${c}`) * 86400000);
      invoices.push({
        client: `Client ${c + 1}`, amount, issued: issued.toISOString().slice(0, 10),
        paid: paid <= end ? paid.toISOString().slice(0, 10) : null,
      });
    });
    tx(5, "income", revenue, { counterparty: p.invoicedShare === 1 ? "Clients" : "Sales" });

    tx(10, "expense", -p.opex * noise(0.15, `opex${ym}`));
    const personalSpend = (p.opex * p.personal) / (1 - p.personal);
    if (personalSpend > 0) tx(14, "expense", -personalSpend * noise(0.2, `pers${ym}`), { personal: true });
    if (p.debt) tx(15, "debt_payment", -p.debt);
    if (p.ownerDraw) tx(28, "owner_draw", -p.ownerDraw);
  }
  return {
    transactions, invoices,
    profile: { name: p.name, business: p.business, location: p.location, founded: p.founded },
  };
}
