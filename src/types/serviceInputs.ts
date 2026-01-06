// Tipos específicos de entrada para serviços (não fazem parte do domínio).

export type CreateUserParams = {
  email: string;
  password: string;
};

export type CreateOrganizationParams = {
  name: string;
  baseCurrency?: string;
};

export type AddUserToOrganizationParams = {
  userId: string;
  organizationId: string;
};

export type UpdateOrganizationParams = {
  organizationId: string;
  name?: string;
  baseCurrency?: string;
};

export type RemoveUserFromOrganizationParams = {
  organizationId: string;
  userId: string;
};

export type CreateTransferParams = {
  organizationId: string;
  fromAccountId: string;
  toAccountId: string;
  categoryId: string | null;
  amount: number; // valor na moeda da conta de origem
  exchangeRate: number; // multiplicador para chegar ao valor na conta destino
  currencyFrom: string;
  currencyTo: string;
  date: string; // ISO date
  note?: string | null;
};
