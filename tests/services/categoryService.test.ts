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
  updateCategory,
  deleteCategory,
} from "../../src/services/categoryService";

describe("categoryService", () => {
  it("creates, updates and deletes categories for an organization", async () => {
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

    const updatedA = await updateCategory(serviceRoleClient, {
      organizationId: organization.id,
      categoryId: categoryA.id,
      name: "a-cat-updated",
    });

    await deleteCategory(serviceRoleClient, organization.id, categoryZ.id);

    try {
      await signInTestUser(user.email, user.password);

      const categories = await listCategories(anonTestClient, organization.id);
      expect(categories.map((c) => c.id)).toEqual([updatedA.id]);
      expect(
        categories.every((c) => c.organizationId === organization.id)
      ).toBe(true);
      expect(categories[0]?.name).toBe("a-cat-updated");
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
