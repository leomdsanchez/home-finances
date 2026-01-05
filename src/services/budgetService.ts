import type { SupabaseClient } from "@supabase/supabase-js";
import { fromDbBudget, toDbBudget, type NewBudgetInput } from "../mappers/budget";
import type { Budget } from "../types/domain";

export const createBudget = async (
  client: SupabaseClient,
  input: NewBudgetInput
): Promise<Budget> => {
  const { data, error } = await client
    .from("budgets")
    .insert(toDbBudget(input))
    .select("id, organization_id, month, category_id, amount, currency")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create budget: ${error?.message ?? "unknown"}`);
  }

  return fromDbBudget(data);
};

export const listBudgets = async (
  client: SupabaseClient,
  organizationId: string
): Promise<Budget[]> => {
  const { data, error } = await client
    .from("budgets")
    .select("id, organization_id, month, category_id, amount, currency")
    .eq("organization_id", organizationId)
    .order("month", { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to list budgets: ${error?.message ?? "unknown"}`);
  }

  return data.map(fromDbBudget);
};
