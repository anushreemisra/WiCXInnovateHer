// Shapes of the records Ada's existing features already hold. Runway reads these; it never
// rebuilds the features that produce them.

export type TransactionType = "income" | "expense" | "debt_payment" | "owner_draw";

/** Transaction history: one bank-feed line. `amount` is positive for money in, negative for money out. */
export interface Transaction {
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  balance: number; // account balance after this transaction
  counterparty?: string;
  personal?: boolean; // expense tracking: flagged as personal spending
}

/** Invoicing and payments: one invoice. */
export interface Invoice {
  client: string;
  amount: number;
  issued: string;
  paid: string | null;
}

/** Business profile. */
export interface Profile {
  name: string;
  business: string;
  location: string;
  founded: string;
}

export interface AdaData {
  transactions: Transaction[];
  invoices: Invoice[];
  profile: Profile;
}
