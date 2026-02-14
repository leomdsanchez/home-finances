import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fromDbTransaction,
  toDbTransaction,
  type NewTransactionInput,
} from "../mappers/transaction";
import type { Transaction } from "../types/domain";
import type { CreateTransferParams } from "../types/serviceInputs";

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

export type TransactionFilters = {
  accountId?: string;
  categoryId?: string;
  type?: "income" | "expense";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export const listTransactionsPaginated = async (
  client: SupabaseClient,
  organizationId: string,
  filters: TransactionFilters = {},
  offset = 0,
  limit = 30,
): Promise<{ data: Transaction[]; count: number }> => {
  const cols =
    "id, organization_id, account_id, category_id, type, amount, currency, date, note, transfer_id, exchange_rate, created_at";

  let query = client
    .from("transactions")
    .select(cols, { count: "exact" })
    .eq("organization_id", organizationId);

  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("date", filters.dateTo);
  if (filters.search) query = query.ilike("note", `%${filters.search}%`);

  query = query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list transactions: ${error.message}`);
  }

  return {
    data: (data ?? []).map(fromDbTransaction),
    count: count ?? 0,
  };
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
    categoryId?: string | null;
  }
): Promise<Transaction> => {
  const { organizationId, transactionId, ...fields } = params;
  const updates: Partial<ReturnType<typeof toDbTransaction>> = {};
  if (fields.amount !== undefined) updates.amount = fields.amount;
  if (fields.note !== undefined) updates.note = fields.note;
  if (fields.date) updates.date = fields.date;
  if (fields.categoryId !== undefined) updates.category_id = fields.categoryId ?? null;

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

const resolveTransferCategoryId = async (
  client: SupabaseClient,
  organizationId: string,
  categoryId?: string | null,
): Promise<string | null> => {
  if (categoryId) return categoryId;

  const { data: existing, error: fetchError } = await client
    .from("categories")
    .select("id")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch categories for transfer: ${fetchError.message}`);
  }

  if (existing?.id) return existing.id;
  return null;
};

export const createTransfer = async (
  client: SupabaseClient,
  params: CreateTransferParams
): Promise<{ from: Transaction; to: Transaction }> => {
  const transferId = crypto.randomUUID();
  const { amount, exchangeRate, currencyFrom, currencyTo, date, note } = params;

  const transferCategoryId = await resolveTransferCategoryId(
    client,
    params.organizationId,
    params.categoryId ?? null
  );

  const { data: accounts, error: accountsError } = await client
    .from("accounts")
    .select("id, organization_id, currency")
    .in("id", [params.fromAccountId, params.toAccountId]);

  if (accountsError) {
    throw new Error(`Failed to validate accounts: ${accountsError.message}`);
  }

  const fromAccount = accounts?.find((a) => a.id === params.fromAccountId);
  const toAccount = accounts?.find((a) => a.id === params.toAccountId);

  if (!fromAccount || !toAccount) {
    throw new Error("Accounts not found for transfer.");
  }

  if (
    fromAccount.organization_id !== params.organizationId ||
    toAccount.organization_id !== params.organizationId
  ) {
    throw new Error("Accounts must belong to the same organization as the transfer.");
  }

  if (fromAccount.currency !== currencyFrom || toAccount.currency !== currencyTo) {
    throw new Error("Currency parameters do not match account currencies.");
  }

  const fromTransaction: NewTransactionInput = {
    organizationId: params.organizationId,
    accountId: params.fromAccountId,
    categoryId: transferCategoryId,
    type: "expense",
    amount,
    currency: currencyFrom,
    date,
    note: note ?? null,
    transferId,
    exchangeRate: 1,
  };

  const convertedAmount =
    exchangeRate > 0 ? Math.round((amount / exchangeRate) * 100) / 100 : 0;

  const toTransaction: NewTransactionInput = {
    organizationId: params.organizationId,
    accountId: params.toAccountId,
    categoryId: transferCategoryId,
    type: "income",
    amount: convertedAmount, // 2 casas para evitar valores estranhos
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
