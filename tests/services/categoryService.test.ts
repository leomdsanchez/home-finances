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
import {
  createCategory,
  listCategories,
} from "../../src/services/categoryService";

describe("categoryService", () => {
  it("creates and lists categories for an organization", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const categoryZ = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `z-cat-${randomUUID()}`,
    });
    const categoryA = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `a-cat-${randomUUID()}`,
    });

    try {
      await signInTestUser(user.email, user.password);

      const categories = await listCategories(anonTestClient, organization.id);
      expect(categories.map((c) => c.id)).toEqual([categoryA.id, categoryZ.id]);
      expect(
        categories.every((c) => c.organizationId === organization.id)
      ).toBe(true);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
