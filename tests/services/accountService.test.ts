import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import {
  anonTestClient,
  serviceRoleClient,
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

    const accountA = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-a-${randomUUID()}`,
      currency: "USD",
      type: "bank",
    });

    const accountB = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-b-${randomUUID()}`,
      currency: "USD",
      type: "bank",
    });

    try {
      await signInTestUser(user.email, user.password);

      const accounts = await listAccounts(anonTestClient, organization.id);
      expect(accounts.map((a) => a.id)).toEqual([accountA.id, accountB.id]);
      expect(accounts.every((a) => a.organizationId === organization.id)).toBe(
        true
      );
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
