import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { Organization, OrganizationMember } from "../types/domain";

type CreateUserAndOrganizationParams = {
  email: string;
  password: string;
  orgName?: string;
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

export const createUserAndOrganization = async (
  client: SupabaseClient,
  params: CreateUserAndOrganizationParams
) => {
  const email = params.email;
  const password = params.password;

  const { data: userData, error: userError } = await client.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
    }
  );

  if (userError || !userData?.user) {
    throw new Error(
      `Failed to create user ${email}: ${userError?.message ?? "unknown"}`
    );
  }

  const orgName = params.orgName ?? `org-${randomUUID()}`;
  const baseCurrency = params.baseCurrency ?? "USD";

  const { data: orgRow, error: orgError } = await client
    .from("organizations")
    .insert({ name: orgName, base_currency: baseCurrency })
    .select("id, name, base_currency, created_at")
    .single();

  if (orgError || !orgRow) {
    await client.auth.admin.deleteUser(userData.user.id);
    throw new Error(
      `Failed to create organization for user ${email}: ${
        orgError?.message ?? "unknown"
      }`
    );
  }

  const { data: membershipRow, error: membershipError } = await client
    .from("organization_members")
    .insert({
      organization_id: orgRow.id,
      user_id: userData.user.id,
    })
    .select("organization_id, user_id, joined_at")
    .single();

  if (membershipError || !membershipRow) {
    await client.from("organizations").delete().eq("id", orgRow.id);
    await client.auth.admin.deleteUser(userData.user.id);
    throw new Error(
      `Failed to link user to organization: ${
        membershipError?.message ?? "unknown"
      }`
    );
  }

  return {
    user: {
      id: userData.user.id,
      email,
      password,
    },
    organization: mapOrganization(orgRow),
    membership: mapMembership(membershipRow),
  };
};

export const addUserToOrganization = async (
  client: SupabaseClient,
  params: AddUserToOrganizationParams
) => {
  const { userId, organizationId } = params;

  const { data, error } = await client
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
    })
    .select("organization_id, user_id, joined_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to add user ${userId} to organization ${organizationId}: ${
        error?.message ?? "unknown"
      }`
    );
  }

  return mapMembership(data);
};
