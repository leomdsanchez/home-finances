import { Transaction, TransactionType } from "../types/domain";

export type DbTransactionRow = {
  id: string;
  organization_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  note: string | null;
  transfer_id: string | null;
  exchange_rate: number | null;
  created_at: string;
};

export type NewTransactionInput = Omit<Transaction, "id" | "createdAt">;

export type DbInsertTransaction = {
  organization_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  note?: string | null;
  transfer_id?: string | null;
  exchange_rate?: number;
};

export const fromDbTransaction = (row: DbTransactionRow): Transaction => ({
  id: row.id,
  organizationId: row.organization_id,
  accountId: row.account_id,
  categoryId: row.category_id,
  type: row.type,
  amount: row.amount,
  currency: row.currency,
  date: row.date,
  note: row.note,
  transferId: row.transfer_id,
  exchangeRate: row.exchange_rate ?? 1,
  createdAt: row.created_at,
});

export const toDbTransaction = (
  input: NewTransactionInput
): DbInsertTransaction => ({
  organization_id: input.organizationId,
  account_id: input.accountId,
  category_id: input.categoryId ?? null,
  type: input.type,
  amount: input.amount,
  currency: input.currency,
  date: input.date,
  note: input.note ?? null,
  transfer_id: input.transferId ?? null,
  exchange_rate: input.exchangeRate ?? 1,
});
