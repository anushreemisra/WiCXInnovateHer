// PDFs generated in the browser from Ada data: financial statements, and a borrower summary
// organised like SBA's borrower information form so a lender can copy from it directly.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Statements } from "./statements.ts";

const INK = rgb(0.11, 0.13, 0.25);
const MUTED = rgb(0.42, 0.44, 0.51);
const money = (n: number) => (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const monthName = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

// Minimal page writer: tracks the cursor and starts a new page when it runs out of room.
class Writer {
  page!: PDFPage;
  y = 0;
  private doc: PDFDocument;
  private font: PDFFont;
  private bold: PDFFont;
  constructor(doc: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.bold = bold;
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([612, 792]); // US Letter
    this.y = 740;
  }
  ensure(space: number) {
    if (this.y - space < 60) this.newPage();
  }
  text(s: string, opts: { size?: number; bold?: boolean; color?: typeof INK; x?: number } = {}) {
    const size = opts.size ?? 10;
    this.ensure(size + 6);
    this.page.drawText(s, { x: opts.x ?? 56, y: this.y, size, font: opts.bold ? this.bold : this.font, color: opts.color ?? INK });
    this.y -= size + 6;
  }
  row(cells: string[], widths: number[], bold = false) {
    this.ensure(16);
    let x = 56;
    cells.forEach((c, i) => {
      const font = bold ? this.bold : this.font;
      // Right-align every column after the first
      const w = font.widthOfTextAtSize(c, 9);
      const cx = i === 0 ? x : x + widths[i] - w;
      this.page.drawText(c, { x: cx, y: this.y, size: 9, font, color: INK });
      x += widths[i];
    });
    this.y -= 15;
  }
  gap(h = 8) {
    this.y -= h;
  }
}

async function start() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, w: new Writer(doc, font, bold) };
}

function header(w: Writer, title: string, business: string, note: string) {
  w.text(title, { size: 18, bold: true });
  w.text(business, { size: 11 });
  w.text(note, { size: 9, color: MUTED });
  w.gap(10);
}

export async function statementsPdf(businessName: string, s: Statements): Promise<Uint8Array> {
  const { doc, w } = await start();
  header(w, "Financial statements", businessName,
    `Prepared from Ada records, ${monthName(s.period.from)} to ${monthName(s.period.to)}. Unaudited.`);

  w.text("Profit and loss, by month", { size: 12, bold: true });
  const widths = [90, 85, 85, 85, 85, 70];
  w.row(["Month", "Revenue", "Costs", "Owner pay", "Loan pmts", "Net"], widths, true);
  for (const m of s.months) {
    w.row([monthName(m.month), money(m.revenue), money(m.costs), money(m.ownerPay), money(m.loanPayments), money(m.net)], widths);
  }
  const t = s.totals;
  w.row(["12-month total", money(t.revenue), money(t.costs), money(t.ownerPay), money(t.loanPayments), money(t.net)], widths, true);
  w.gap(12);

  w.text("Cash", { size: 12, bold: true });
  w.text(`Business account balance at end of ${monthName(s.period.to)}: ${money(s.endingCash)}`);
  w.gap(8);

  w.text("Existing debt", { size: 12, bold: true });
  w.text(s.monthlyLoanPayment > 0
    ? `Loan payments of ${money(s.monthlyLoanPayment)} per month. Attach the lender statement for balance and terms.`
    : "No loan payments in the last 12 months.");
  w.gap(8);

  if (s.topClients.length) {
    w.text("Largest clients (share of revenue)", { size: 12, bold: true });
    for (const c of s.topClients) w.text(`${c.client}: ${money(c.amount)} (${(c.share * 100).toFixed(0)}%)`);
  }
  return doc.save();
}

export interface BorrowerSummary {
  businessName: string;
  ownerName: string;
  entityType: string;
  naics: string;
  location: string;
  founded: string;
  ownership: string;
  loanAmount: number;
  loanProgram: string;
  useOfFunds: string;
  businessDescription: string;
  statements: Statements;
}

export async function borrowerSummaryPdf(b: BorrowerSummary): Promise<Uint8Array> {
  const { doc, w } = await start();
  header(w, "Borrower information summary", b.businessName,
    "Organised like SBA Form 1919 (Borrower Information Form) so a lender can transfer it. Not an official SBA form.");

  const section = (title: string, lines: [string, string][]) => {
    w.text(title, { size: 12, bold: true });
    for (const [k, v] of lines) w.text(`${k}: ${v}`);
    w.gap(8);
  };
  section("Applicant business", [
    ["Legal name", b.businessName],
    ["Business type", b.entityType],
    ["Industry (NAICS)", b.naics],
    ["Location", b.location],
    ["Date established", b.founded],
  ]);
  section("Owners", [["Owner", b.ownerName], ["Ownership", b.ownership]]);
  section("Loan request", [["Program", b.loanProgram], ["Amount requested", money(b.loanAmount)]]);

  w.text("Use of funds", { size: 12, bold: true });
  wrap(b.useOfFunds || "(not written yet)").forEach((l) => w.text(l));
  w.gap(8);
  w.text("About the business", { size: 12, bold: true });
  wrap(b.businessDescription || "(not written yet)").forEach((l) => w.text(l));
  w.gap(8);

  const t = b.statements.totals;
  section("Financial snapshot (last 12 months, from Ada)", [
    ["Revenue", money(t.revenue)],
    ["Business costs", money(t.costs)],
    ["Owner pay", money(t.ownerPay)],
    ["Existing loan payments", money(t.loanPayments)],
    ["Cash at period end", money(b.statements.endingCash)],
  ]);
  return doc.save();
}

// Rough word wrap for 10pt Helvetica across the page width.
function wrap(text: string, max = 95): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if ((line + " " + word).trim().length > max) {
        out.push(line);
        line = word;
      } else line = (line + " " + word).trim();
    }
    if (line) out.push(line);
  }
  return out;
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
