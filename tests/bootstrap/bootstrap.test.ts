import { describe, expect, it } from "vitest";
import { anonTestClient } from "../setup/testEnv";
import {
  cleanupTestArtifacts,
  createOrganizationForUser,
  createTestUser,
  fetchMembership,
  signInTestUser,
} from "../setup/testDataFactory";

describe("bootstrap smoke test", () => {
  it("creates a user, organization and membership", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    try {
      await signInTestUser(user.email, user.password);

      const orgResult = await anonTestClient
        .from("organizations")
        .select("id, name, base_currency")
        .eq("id", organization.id)
        .maybeSingle();

      expect(orgResult.error).toBeNull();
      expect(orgResult.data?.id).toBe(organization.id);
      expect(orgResult.data?.base_currency).toBe("USD");

      const membership = await fetchMembership(
        organization.id,
        user.id,
        anonTestClient
      );

      expect(membership).not.toBeNull();
      expect(membership?.organizationId).toBe(organization.id);
      expect(membership?.userId).toBe(user.id);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
