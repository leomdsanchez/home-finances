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
import { createBudget, listBudgets } from "../../src/services/budgetService";
import { createCategory } from "../../src/services/categoryService";

describe("budgetService", () => {
  it("creates and lists budgets for an organization", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });

    const budget = await createBudget(serviceRoleClient, {
      organizationId: organization.id,
      month: "2025-01",
      categoryId: category.id,
      amount: 1000,
      currency: "USD",
    });

    try {
      await signInTestUser(user.email, user.password);

      const budgets = await listBudgets(anonTestClient, organization.id);
      expect(budgets.find((b) => b.id === budget.id)).toBeDefined();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
