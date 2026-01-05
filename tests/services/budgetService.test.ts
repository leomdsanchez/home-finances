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
  createBudget,
  listBudgets,
  updateBudget,
  deleteBudget,
} from "../../src/services/budgetService";
import { createCategory } from "../../src/services/categoryService";

describe("budgetService", () => {
  it("creates, updates and deletes budgets for an organization", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });

    const budgetJan = await createBudget(serviceRoleClient, {
      organizationId: organization.id,
      month: "2025-01",
      categoryId: category.id,
      amount: 1000,
      currency: "USD",
    });
    const budgetFeb = await createBudget(serviceRoleClient, {
      organizationId: organization.id,
      month: "2025-02",
      categoryId: category.id,
      amount: 1200,
      currency: "USD",
    });

    const updatedJan = await updateBudget(serviceRoleClient, {
      organizationId: organization.id,
      budgetId: budgetJan.id,
      amount: 1100,
    });

    await deleteBudget(serviceRoleClient, organization.id, budgetFeb.id);

    try {
      await signInTestUser(user.email, user.password);

      const budgets = await listBudgets(anonTestClient, organization.id);
      expect(budgets.map((b) => b.id)).toEqual([updatedJan.id]);
      expect(budgets[0]?.amount).toBe(1100);
      expect(budgets.every((b) => b.organizationId === organization.id)).toBe(
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
