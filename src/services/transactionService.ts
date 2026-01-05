import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fromDbTransaction,
  toDbTransaction,
  type NewTransactionInput,
} from "../mappers/transaction";
import type { Transaction } from "../types/domain";
import type { CreateTransferParams } from "../types/serviceInputs";
import { randomUUID } from "crypto";

export const createTransaction = async (
  client: SupabaseClient,
  input: NewTransactionInput
): Promise<Transaction> => {
  const { data, error } = await client
    .from("transactions")
    .insert(toDbTransaction(input))
    .select(
      "id, organization_id, account_id, category_id, type, amount, currency, date, note, transfer_id, exchange_rate, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to create transaction: ${error?.message ?? "unknown"}`);
  }

  return fromDbTransaction(data);
};

export const listTransactions = async (
  client: SupabaseClient,
  organizationId: string
): Promise<Transaction[]> => {
  const { data, error } = await client
    .from("transactions")
    .select(
      "id, organization_id, account_id, category_id, type, amount, currency, date, note, transfer_id, exchange_rate, created_at"
    )
    .eq("organization_id", organizationId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to list transactions: ${error?.message ?? "unknown"}`);
  }

  return data.map(fromDbTransaction);
};

export const deleteTransaction = async (
  client: SupabaseClient,
  organizationId: string,
  transactionId: string
): Promise<void> => {
  const { error } = await client
    .from("transactions")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", transactionId);

  if (error) {
    throw new Error(`Failed to delete transaction ${transactionId}: ${error.message}`);
  }
};

export const updateTransaction = async (
  client: SupabaseClient,
  params: {
    organizationId: string;
    transactionId: string;
    amount?: number;
    note?: string | null;
    date?: string;
    categoryId?: string;
  }
): Promise<Transaction> => {
  const { organizationId, transactionId, ...fields } = params;
  const updates: Partial<ReturnType<typeof toDbTransaction>> = {};
  if (fields.amount !== undefined) updates.amount = fields.amount;
  if (fields.note !== undefined) updates.note = fields.note;
  if (fields.date) updates.date = fields.date;
  if (fields.categoryId) updates.category_id = fields.categoryId;

  const { data, error } = await client
    .from("transactions")
    .update(updates)
    .eq("organization_id", organizationId)
    .eq("id", transactionId)
    .select(
      "id, organization_id, account_id, category_id, type, amount, currency, date, note, transfer_id, exchange_rate, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update transaction ${transactionId}: ${error?.message ?? "unknown"}`
    );
  }

  return fromDbTransaction(data);
};

export const deleteTransfer = async (
  client: SupabaseClient,
  organizationId: string,
  transferId: string
): Promise<void> => {
  const { data, error } = await client
    .from("transactions")
    .delete()
    .eq("organization_id", organizationId)
    .eq("transfer_id", transferId)
    .select("id");

  if (error) {
    throw new Error(`Failed to delete transfer ${transferId}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`Transfer ${transferId} not found for organization ${organizationId}`);
  }
};

export const createTransfer = async (
  client: SupabaseClient,
  params: CreateTransferParams
): Promise<{ from: Transaction; to: Transaction }> => {
  const transferId = randomUUID();
  const { amount, exchangeRate, currencyFrom, currencyTo, date, note } = params;

  const fromTransaction: NewTransactionInput = {
    organizationId: params.organizationId,
    accountId: params.fromAccountId,
    categoryId: params.categoryId,
    type: "expense",
    amount,
    currency: currencyFrom,
    date,
    note: note ?? null,
    transferId,
    exchangeRate: 1,
  };

  const toTransaction: NewTransactionInput = {
    organizationId: params.organizationId,
    accountId: params.toAccountId,
    categoryId: params.categoryId,
    type: "income",
    amount: Math.round(amount * exchangeRate * 100) / 100, // 2 casas para evitar valores estranhos
    currency: currencyTo,
    date,
    note: note ?? null,
    transferId,
    exchangeRate,
  };

  const { data, error } = await client
    .from("transactions")
    .insert([toDbTransaction(fromTransaction), toDbTransaction(toTransaction)])
    .select(
      "id, organization_id, account_id, category_id, type, amount, currency, date, note, transfer_id, exchange_rate, created_at"
    );

  if (error || !data || data.length !== 2) {
    throw new Error(
      `Failed to create transfer: ${error?.message ?? "unknown"}`
    );
  }

  const mapped = data.map(fromDbTransaction);
  const from = mapped.find((t) => t.accountId === params.fromAccountId);
  const to = mapped.find((t) => t.accountId === params.toAccountId);

  if (!from || !to) {
    throw new Error("Failed to resolve transfer transactions");
  }

  return { from, to };
};
