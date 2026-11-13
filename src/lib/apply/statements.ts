// Lender-style statements built from Ada's existing records: the documents almost every
// application asks for, generated instead of typed.

import type { AdaData } from "../ada/types.ts";

export interface MonthRow {
  month: string; // YYYY-MM
  revenue: number;
  costs: number;
  ownerPay: number;
  loanPayments: number;
  net: number; // revenue − costs − owner pay − loan payments
  endingCash: number;
}

export interface Statements {
  months: MonthRow[]; // last 12 months, oldest first
  totals: Omit<MonthRow, "month" | "endingCash">;
  endingCash: number;
  monthlyLoanPayment: number;
  topClients: { client: string; amount: number; share: number }[];
  period: { from: string; to: string };
}

const monthKey = (d: string) => d.slice(0, 7);

export function buildStatements({ transactions, invoices }: AdaData): Statements {
  const allMonths = [...new Set(transactions.map((t) => monthKey(t.date)))].sort();
  const months = allMonths.slice(-12).map((month): MonthRow => {
    const tx = transactions.filter((t) => monthKey(t.date) === month);
    const total = (type: string, filter: (t: (typeof tx)[number]) => boolean = () => true) =>
      tx.filter((t) => t.type === type && filter(t)).reduce((a, t) => a + Math.abs(t.amount), 0);
    const revenue = total("income");
    const costs = total("expense", (t) => !t.personal);
    const ownerPay = total("owner_draw");
    const loanPayments = total("debt_payment");
    return {
      month, revenue, costs, ownerPay, loanPayments,
      net: revenue - costs - ownerPay - loanPayments,
      endingCash: tx[tx.length - 1].balance,
    };
  });

  const sum = (k: keyof Omit<MonthRow, "month">) => months.reduce((a, m) => a + m[k], 0);
  const totals = {
    revenue: sum("revenue"), costs: sum("costs"), ownerPay: sum("ownerPay"),
    loanPayments: sum("loanPayments"), net: sum("net"),
  };

  const recent = new Set(months.map((m) => m.month));
  const byClient: Record<string, number> = {};
  for (const i of invoices.filter((i) => recent.has(monthKey(i.issued)))) {
    byClient[i.client] = (byClient[i.client] || 0) + i.amount;
  }
  const topClients = Object.entries(byClient)
    .map(([client, amount]) => ({ client, amount, share: totals.revenue ? amount / totals.revenue : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    months, totals,
    endingCash: months[months.length - 1].endingCash,
    monthlyLoanPayment: months[months.length - 1].loanPayments,
    topClients,
    period: { from: months[0].month, to: months[months.length - 1].month },
  };
}
