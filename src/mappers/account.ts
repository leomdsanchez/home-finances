import { Account, AccountType } from "../types/domain";

export type DbAccountRow = {
  id: string;
  organization_id: string;
  name: string;
  currency: string;
  type: AccountType;
  created_at: string;
};

export type NewAccountInput = Omit<Account, "id" | "createdAt">;

export type DbInsertAccount = {
  organization_id: string;
  name: string;
  currency: string;
  type: AccountType;
};

export const fromDbAccount = (row: DbAccountRow): Account => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  currency: row.currency,
  type: row.type,
  createdAt: row.created_at,
});

export const toDbAccount = (input: NewAccountInput): DbInsertAccount => ({
  organization_id: input.organizationId,
  name: input.name,
  currency: input.currency,
  type: input.type,
});
