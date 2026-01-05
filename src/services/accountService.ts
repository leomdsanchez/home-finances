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
