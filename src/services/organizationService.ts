import type { SupabaseClient } from "@supabase/supabase-js";
import type { Organization, OrganizationMember } from "../types/domain";

type CreateUserParams = {
  email: string;
  password: string;
};

type CreateOrganizationParams = {
  name: string;
  baseCurrency?: string;
};

type AddUserToOrganizationParams = {
  userId: string;
  organizationId: string;
};

const mapOrganization = (row: {
  id: string;
  name: string;
  base_currency: string;
  created_at: string;
}): Organization => ({
  id: row.id,
  name: row.name,
  baseCurrency: row.base_currency,
  createdAt: row.created_at,
});

const mapMembership = (row: {
  organization_id: string;
  user_id: string;
  joined_at: string;
}): OrganizationMember => ({
  organizationId: row.organization_id,
  userId: row.user_id,
  joinedAt: row.joined_at,
});

export const createUser = async (
  client: SupabaseClient,
  params: CreateUserParams
) => {
  const { email, password } = params;

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data?.user) {
    throw new Error(`Failed to create user ${email}: ${error?.message ?? "unknown"}`);
  }

  return {
    id: data.user.id,
    email,
    password,
  };
};

export const createOrganization = async (
  client: SupabaseClient,
  params: CreateOrganizationParams
) => {
  const { name, baseCurrency = "USD" } = params;

  const { data, error } = await client
    .from("organizations")
    .insert({ name, base_currency: baseCurrency })
    .select("id, name, base_currency, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create organization ${name}: ${error?.message ?? "unknown"}`
    );
  }

  return mapOrganization(data);
};

export const addUserToOrganization = async (
  client: SupabaseClient,
  params: AddUserToOrganizationParams
) => {
  const { userId, organizationId } = params;

  // Try insert; if PK already exists, fetch existing membership.
  const { data, error } = await client
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
    })
    .select("organization_id, user_id, joined_at")
    .single();

  if (error && error.code !== "23505") {
    throw new Error(
      `Failed to add user ${userId} to organization ${organizationId}: ${
        error?.message ?? "unknown"
      }`
    );
  }

  if (data) {
    return mapMembership(data);
  }

  const { data: existing, error: fetchError } = await client
    .from("organization_members")
    .select("organization_id, user_id, joined_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !existing) {
    throw new Error(
      `Failed to resolve membership for user ${userId} in organization ${organizationId}: ${
        fetchError?.message ?? "unknown"
      }`
    );
  }

  return mapMembership(existing);
};
