// Shared TypeScript types — mirror the backend's Pydantic schemas.
// Keep these in sync with `backend/app/schemas.py`.

export type AccountType =
  | 'cash'
  | 'bank'
  | 'credit_card'
  | 'investment'
  | 'other';

export type TransactionType = 'income' | 'expense';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: string; // server returns Decimal as string
  currency: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number | null;
  type: TransactionType;
  amount: string;
  note: string | null;
  occurred_on: string; // YYYY-MM-DD
  receipt_url: string | null; // e.g. "/uploads/u1_t5_abcd.jpg"
  created_at: string;
}

export interface MonthlyStats {
  month: string;
  income: string;
  expense: string;
  net: string;
  by_category: Array<{
    category_id: number | null;
    category_name: string;
    total: string;
    count: number;
  }>;
}

// Helpful labels for displaying account types in the UI.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  credit_card: 'Credit Card',
  investment: 'Investment',
  other: 'Other',
};
