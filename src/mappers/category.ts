import { Category } from "../types/domain";

export type DbCategoryRow = {
  id: string;
  organization_id: string;
  name: string;
};

export type NewCategoryInput = Omit<Category, "id">;

export type DbInsertCategory = {
  organization_id: string;
  name: string;
};

export const fromDbCategory = (row: DbCategoryRow): Category => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
});

export const toDbCategory = (input: NewCategoryInput): DbInsertCategory => ({
  organization_id: input.organizationId,
  name: input.name,
});
