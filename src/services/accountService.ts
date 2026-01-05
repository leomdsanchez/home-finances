import type { SupabaseClient } from "@supabase/supabase-js";
import { fromDbAccount, toDbAccount, type NewAccountInput } from "../mappers/account";
import type { Account } from "../types/domain";

export const createAccount = async (
  client: SupabaseClient,
  input: NewAccountInput
): Promise<Account> => {
  const { data, error } = await client
    .from("accounts")
    .insert(toDbAccount(input))
    .select(
      "id, organization_id, name, currency, type, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(`Failed to create account: ${error?.message ?? "unknown"}`);
  }

  return fromDbAccount(data);
};

export const listAccounts = async (
  client: SupabaseClient,
  organizationId: string
): Promise<Account[]> => {
  const { data, error } = await client
    .from("accounts")
    .select("id, organization_id, name, currency, type, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to list accounts: ${error?.message ?? "unknown"}`);
  }

  return data.map(fromDbAccount);
};

export const updateAccount = async (
  client: SupabaseClient,
  params: {
    organizationId: string;
    accountId: string;
    name?: string;
    currency?: string;
    type?: Account["type"];
  }
): Promise<Account> => {
  const { organizationId, accountId, ...fields } = params;
  const updates: Partial<DbInsertAccount> = {};
  if (fields.name) updates.name = fields.name;
  if (fields.currency) updates.currency = fields.currency;
  if (fields.type) updates.type = fields.type;

  const { data, error } = await client
    .from("accounts")
    .update(updates)
    .eq("id", accountId)
    .eq("organization_id", organizationId)
    .select("id, organization_id, name, currency, type, created_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update account ${accountId}: ${error?.message ?? "unknown"}`);
  }

  return fromDbAccount(data);
};

export const deleteAccount = async (
  client: SupabaseClient,
  organizationId: string,
  accountId: string
): Promise<void> => {
  const { error } = await client
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to delete account ${accountId}: ${error.message}`);
  }
};
