import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import {
  anonTestClient,
  serviceRoleClient,
  TEST_USER_PASSWORD,
} from "../setup/testEnv";
import {
  cleanupTestArtifacts,
  createOrganizationForUser,
  createTestUser,
  signInTestUser,
} from "../setup/testDataFactory";
import { createAccount, listAccounts } from "../../src/services/accountService";

describe("accountService", () => {
  it("creates and lists accounts for an organization", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const account = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-${randomUUID()}`,
      currency: "USD",
      type: "bank",
      createdAt: new Date().toISOString(),
    });

    try {
      await signInTestUser(user.email, user.password);

      const accounts = await listAccounts(anonTestClient, organization.id);
      expect(accounts.find((a) => a.id === account.id)).toBeDefined();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
