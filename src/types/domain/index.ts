export type AccountType = "bank" | "card" | "cash" | "other";
export type TransactionType = "income" | "expense";

export type Organization = {
  id: string;
  name: string;
  base_currency: string;
  created_at: string;
};

export type OrganizationMember = {
  organization_id: string;
  user_id: string;
  joined_at: string;
};

export type Account = {
  id: string;
  organization_id: string;
  name: string;
  currency: string;
  type: AccountType;
  created_at: string;
};

export type Category = {
  id: string;
  organization_id: string;
  name: string;
};

export type Transaction = {
  id: string;
  organization_id: string;
  account_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  note: string | null;
  transfer_id: string | null;
  exchange_rate: number;
  created_at: string;
};

export type Budget = {
  id: string;
  organization_id: string;
  month: string;
  category_id: string | null;
  amount: number;
  currency: string;
};

export type Currency = {
  code: string;
  symbol: string;
};
