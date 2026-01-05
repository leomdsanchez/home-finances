import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Organization, OrganizationMember } from "../../src/types/domain";
import {
  anonTestClient,
  serviceRoleClient,
  TEST_USER_PASSWORD,
} from "./testEnv";

export type TestUser = {
  id: string;
  email: string;
  password: string;
};

export const createTestUser = async (): Promise<TestUser> => {
  const email = `test-${randomUUID()}@example.com`;

  const { data, error } = await serviceRoleClient.auth.admin.createUser({
    email,
    password: TEST_USER_PASSWORD,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? "unknown"}`);
  }

  return {
    id: data.user.id,
    email,
    password: TEST_USER_PASSWORD,
  };
};

export const createOrganizationForUser = async (
  userId: string
): Promise<Organization> => {
  const { data, error } = await serviceRoleClient
    .from("organizations")
    .insert({ name: `test-org-${randomUUID()}`, base_currency: "USD" })
    .select("id, name, base_currency, created_at")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create organization for user ${userId}: ${error?.message ?? "unknown"}`
    );
  }

  const { error: membershipError } = await serviceRoleClient
    .from("organization_members")
    .insert({ organization_id: data.id, user_id: userId });

  if (membershipError) {
    await serviceRoleClient.from("organizations").delete().eq("id", data.id);
    throw new Error(
      `Failed to link user ${userId} to organization: ${membershipError.message}`
    );
  }

  return {
    id: data.id,
    name: data.name,
    baseCurrency: data.base_currency,
    createdAt: data.created_at,
  };
};

export const fetchMembership = async (
  organizationId: string,
  userId: string,
  client: SupabaseClient = serviceRoleClient
): Promise<OrganizationMember | null> => {
  const { data, error } = await client
    .from("organization_members")
    .select("organization_id, user_id, joined_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch membership for user ${userId}: ${error.message}`
    );
  }

  if (!data) return null;

  return {
    organizationId: data.organization_id,
    userId: data.user_id,
    joinedAt: data.joined_at,
  };
};

export const signInTestUser = async (email: string, password: string) => {
  const { error, data } = await anonTestClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in test user ${email}: ${error.message}`);
  }

  return data.session;
};

export const cleanupTestArtifacts = async (params: {
  organizationId?: string;
  userId?: string;
}) => {
  const { organizationId, userId } = params;

  if (organizationId) {
    await serviceRoleClient
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId);
    await serviceRoleClient.from("organizations").delete().eq("id", organizationId);
  }

  if (userId) {
    await serviceRoleClient.auth.admin.deleteUser(userId);
  }
};
