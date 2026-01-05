import type { SupabaseClient } from "@supabase/supabase-js";
import { fromDbBudget, toDbBudget, type DbInsertBudget, type NewBudgetInput } from "../mappers/budget";
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

export const updateBudget = async (
  client: SupabaseClient,
  params: {
    organizationId: string;
    budgetId: string;
    amount?: number;
    categoryId?: string | null;
    month?: string;
    currency?: string;
  }
): Promise<Budget> => {
  const { organizationId, budgetId, ...fields } = params;
  const updates: Partial<DbInsertBudget> = {};
  if (fields.amount !== undefined) updates.amount = fields.amount;
  if (fields.categoryId !== undefined) updates.category_id = fields.categoryId;
  if (fields.month) updates.month = fields.month;
  if (fields.currency) updates.currency = fields.currency;

  const { data, error } = await client
    .from("budgets")
    .update(updates)
    .eq("id", budgetId)
    .eq("organization_id", organizationId)
    .select("id, organization_id, month, category_id, amount, currency")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update budget ${budgetId}: ${error?.message ?? "unknown"}`);
  }

  return fromDbBudget(data);
};

export const deleteBudget = async (
  client: SupabaseClient,
  organizationId: string,
  budgetId: string
): Promise<void> => {
  const { error } = await client
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to delete budget ${budgetId}: ${error.message}`);
  }
};
