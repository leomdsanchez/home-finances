import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import {
  anonTestClient,
  serviceRoleClient,
  TEST_USER_PASSWORD,
} from "../setup/testEnv";
import {
  cleanupTestArtifacts,
  fetchMembership,
  signInTestUser,
} from "../setup/testDataFactory";
import {
  addUserToOrganization,
  createOrganization,
  createUser,
} from "../../src/services/organizationService";

describe("organizationService", () => {
  it("creates a user without an organization", async () => {
    const email = `svc-${randomUUID()}@example.com`;
    const password = TEST_USER_PASSWORD;

    const user = await createUser(serviceRoleClient, { email, password });

    try {
      await signInTestUser(email, password);
      // No org membership should exist yet
      const membership = await fetchMembership("00000000-0000-0000-0000-000000000000", user.id, anonTestClient);
      expect(membership).toBeNull();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({ userId: user.id });
    }
  });

  it("creates an organization for a user and links membership", async () => {
    const email = `owner-${randomUUID()}@example.com`;
    const password = TEST_USER_PASSWORD;

    const user = await createUser(serviceRoleClient, { email, password });
    const organization = await createOrganization(serviceRoleClient, {
      name: `Org-${randomUUID()}`,
      baseCurrency: "USD",
    });

    const membership = await addUserToOrganization(serviceRoleClient, {
      organizationId: organization.id,
      userId: user.id,
    });

    try {
      await signInTestUser(email, password);
      expect(membership.organizationId).toBe(organization.id);
      const fetched = await fetchMembership(
        organization.id,
        user.id,
        anonTestClient
      );
      expect(fetched).not.toBeNull();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });

  it("adds an existing user to an existing organization", async () => {
    const ownerEmail = `owner-${randomUUID()}@example.com`;
    const memberEmail = `member-${randomUUID()}@example.com`;

    const owner = await createUser(serviceRoleClient, {
      email: ownerEmail,
      password: TEST_USER_PASSWORD,
    });
    const organization = await createOrganization(serviceRoleClient, {
      name: `Org-${randomUUID()}`,
      baseCurrency: "USD",
    });
    await addUserToOrganization(serviceRoleClient, {
      organizationId: organization.id,
      userId: owner.id,
    });

    const member = await createUser(serviceRoleClient, {
      email: memberEmail,
      password: TEST_USER_PASSWORD,
    });

    try {
      const membership = await addUserToOrganization(serviceRoleClient, {
        organizationId: organization.id,
        userId: member.id,
      });

      expect(membership.organizationId).toBe(organization.id);
      expect(membership.userId).toBe(member.id);

      await signInTestUser(member.email, member.password);
      const fetched = await fetchMembership(
        organization.id,
        member.id,
        anonTestClient
      );
      expect(fetched).not.toBeNull();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: owner.id,
      });
      await cleanupTestArtifacts({
        userId: member.id,
      });
    }
  });
});
