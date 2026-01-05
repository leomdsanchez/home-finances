import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { anonTestClient, serviceRoleClient, TEST_USER_PASSWORD } from "../setup/testEnv";
import { cleanupTestArtifacts, fetchMembership, signInTestUser } from "../setup/testDataFactory";
import {
  addUserToOrganization,
  createUserAndOrganization,
} from "../../src/services/organizationService";

describe("organizationService", () => {
  it("creates user, organization and membership", async () => {
    const email = `svc-${randomUUID()}@example.com`;
    const password = TEST_USER_PASSWORD;

    const result = await createUserAndOrganization(serviceRoleClient, {
      email,
      password,
      orgName: `Org-${randomUUID()}`,
      baseCurrency: "USD",
    });

    try {
      await signInTestUser(email, password);

      const { data: orgData, error: orgError } = await anonTestClient
        .from("organizations")
        .select("id, name, base_currency")
        .eq("id", result.organization.id)
        .maybeSingle();

      expect(orgError).toBeNull();
      expect(orgData?.id).toBe(result.organization.id);

      const membership = await fetchMembership(
        result.organization.id,
        result.user.id,
        anonTestClient
      );
      expect(membership).not.toBeNull();
      expect(membership?.organizationId).toBe(result.organization.id);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: result.organization.id,
        userId: result.user.id,
      });
    }
  });

  it("adds a user to an existing organization", async () => {
    const ownerEmail = `owner-${randomUUID()}@example.com`;
    const memberEmail = `member-${randomUUID()}@example.com`;

    const owner = await createUserAndOrganization(serviceRoleClient, {
      email: ownerEmail,
      password: TEST_USER_PASSWORD,
      orgName: `Org-${randomUUID()}`,
      baseCurrency: "USD",
    });

    const member = await createUserAndOrganization(serviceRoleClient, {
      email: memberEmail,
      password: TEST_USER_PASSWORD,
      orgName: `Temp-${randomUUID()}`,
      baseCurrency: "USD",
    });

    // Remove the temp org for the member; we just need the user record
    await cleanupTestArtifacts({
      organizationId: member.organization.id,
    });

    try {
      const membership = await addUserToOrganization(serviceRoleClient, {
        organizationId: owner.organization.id,
        userId: member.user.id,
      });

      expect(membership.organizationId).toBe(owner.organization.id);
      expect(membership.userId).toBe(member.user.id);

      await signInTestUser(member.user.email, member.user.password);
      const fetched = await fetchMembership(
        owner.organization.id,
        member.user.id,
        anonTestClient
      );
      expect(fetched).not.toBeNull();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: owner.organization.id,
        userId: owner.user.id,
      });
      await cleanupTestArtifacts({
        userId: member.user.id,
      });
    }
  });
});
