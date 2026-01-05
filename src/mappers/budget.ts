import { Budget } from "../types/domain";

export type DbBudgetRow = {
  id: string;
  organization_id: string;
  month: string;
  category_id: string | null;
  amount: number;
  currency: string;
};

export type NewBudgetInput = Omit<Budget, "id">;

export type DbInsertBudget = {
  organization_id: string;
  month: string;
  category_id: string | null;
  amount: number;
  currency: string;
};

export const fromDbBudget = (row: DbBudgetRow): Budget => ({
  id: row.id,
  organizationId: row.organization_id,
  month: row.month,
  categoryId: row.category_id,
  amount: row.amount,
  currency: row.currency,
});

export const toDbBudget = (input: NewBudgetInput): DbInsertBudget => ({
  organization_id: input.organizationId,
  month: input.month,
  category_id: input.categoryId ?? null,
  amount: input.amount,
  currency: input.currency,
});
