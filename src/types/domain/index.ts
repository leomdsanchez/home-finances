export type AccountType = "bank" | "card" | "cash" | "other";
export type TransactionType = "income" | "expense";

export type Organization = {
  id: string;
  name: string;
  baseCurrency: string;
  createdAt: string;
};

export type OrganizationMember = {
  organizationId: string;
  userId: string;
  joinedAt: string;
};

export type Account = {
  id: string;
  organizationId: string;
  name: string;
  currency: string;
  type: AccountType;
  createdAt: string;
};

export type Category = {
  id: string;
  organizationId: string;
  name: string;
};

export type Transaction = {
  id: string;
  organizationId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  note: string | null;
  transferId: string | null;
  exchangeRate: number;
  createdAt: string;
};

export type Budget = {
  id: string;
  organizationId: string;
  categoryId: string | null;
  amount: number;
  currency: string;
};

export type Currency = {
  code: string;
  symbol: string;
};

export type ExchangeDefault = {
  organizationId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: string;
};
