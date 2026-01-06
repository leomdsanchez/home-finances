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
    const outsider = await createTestUser();
    const outsiderOrg = await createOrganizationForUser(outsider.id);

    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });

    const generalBudget = await createBudget(serviceRoleClient, {
      organizationId: organization.id,
      categoryId: null,
      amount: 1000,
      currency: "USD",
    });
    const catBudget = await createBudget(serviceRoleClient, {
      organizationId: organization.id,
      categoryId: category.id,
      amount: 1200,
      currency: "USD",
    });

    const updatedCatBudget = await updateBudget(serviceRoleClient, {
      organizationId: organization.id,
      budgetId: catBudget.id,
      amount: 1100,
    });

    // Delete general budget, keep category budget
    await deleteBudget(serviceRoleClient, organization.id, generalBudget.id);

    try {
      await signInTestUser(user.email, user.password);

      const budgets = await listBudgets(anonTestClient, organization.id);
      expect(budgets.map((b) => b.id)).toEqual([updatedCatBudget.id]);
      expect(budgets[0]?.amount).toBe(1100);
      expect(budgets.every((b) => b.organizationId === organization.id)).toBe(
        true
      );
    } finally {
      await anonTestClient.auth.signOut();
    }

    await signInTestUser(outsider.email, outsider.password);
    const outsiderView = await listBudgets(anonTestClient, organization.id);
    expect(outsiderView.length).toBe(0);
    await anonTestClient.auth.signOut();

    await cleanupTestArtifacts({
      organizationId: organization.id,
      userId: user.id,
    });
    await cleanupTestArtifacts({
      organizationId: outsiderOrg.id,
      userId: outsider.id,
    });
  });

  it("rejects duplicate general budget and duplicate category budget", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });

    await createBudget(serviceRoleClient, {
      organizationId: organization.id,
      categoryId: null,
      amount: 100,
      currency: "USD",
    });

    await expect(
      createBudget(serviceRoleClient, {
        organizationId: organization.id,
        categoryId: null,
        amount: 200,
        currency: "USD",
      })
    ).rejects.toThrow();

    await createBudget(serviceRoleClient, {
      organizationId: organization.id,
      categoryId: category.id,
      amount: 300,
      currency: "USD",
    });

    await expect(
      createBudget(serviceRoleClient, {
        organizationId: organization.id,
        categoryId: category.id,
        amount: 400,
        currency: "USD",
      })
    ).rejects.toThrow();

    await cleanupTestArtifacts({ organizationId: organization.id, userId: user.id });
  });
});
