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
