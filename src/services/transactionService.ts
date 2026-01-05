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
