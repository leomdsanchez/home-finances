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
import { createCategory } from "../../src/services/categoryService";
import { createAccount } from "../../src/services/accountService";
import { createBudget } from "../../src/services/budgetService";
import {
  createTransfer,
  deleteTransaction,
} from "../../src/services/transactionService";

describe("negative scenarios", () => {
  it("rejects duplicate category and account names in the same org", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: "dup-cat",
    });

    await expect(
      createCategory(serviceRoleClient, {
        organizationId: organization.id,
        name: "dup-cat",
      })
    ).rejects.toThrow();

    await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: "dup-acc",
      currency: "USD",
      type: "bank",
    });

    await expect(
      createAccount(serviceRoleClient, {
        organizationId: organization.id,
        name: "dup-acc",
        currency: "USD",
        type: "bank",
      })
    ).rejects.toThrow();

    await cleanupTestArtifacts({ organizationId: organization.id, userId: user.id });
  });

  it("rejects budget with category from another org", async () => {
    const owner = await createTestUser();
    const orgA = await createOrganizationForUser(owner.id);
    const other = await createTestUser();
    const orgB = await createOrganizationForUser(other.id);

    const catB = await createCategory(serviceRoleClient, {
      organizationId: orgB.id,
      name: "other-cat",
    });

    await expect(
      createBudget(serviceRoleClient, {
        organizationId: orgA.id,
        month: "2025-06",
        categoryId: catB.id,
        amount: 100,
        currency: "USD",
      })
    ).rejects.toThrow();

    await cleanupTestArtifacts({ organizationId: orgA.id, userId: owner.id });
    await cleanupTestArtifacts({ organizationId: orgB.id, userId: other.id });
  });

  it("rejects transfer when currency params mismatch account currencies", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);
    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });
    const from = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: "from",
      currency: "USD",
      type: "bank",
    });
    const to = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: "to",
      currency: "BRL",
      type: "bank",
    });

    await expect(
      createTransfer(serviceRoleClient, {
        organizationId: organization.id,
        fromAccountId: from.id,
        toAccountId: to.id,
        categoryId: category.id,
        amount: 50,
        exchangeRate: 5,
        currencyFrom: "EUR", // mismatch
        currencyTo: "USD", // mismatch
        date: "2025-07-01",
      })
    ).rejects.toThrow();

    await cleanupTestArtifacts({ organizationId: organization.id, userId: user.id });
  });

  it("leaves orphan leg if deleting a single transfer transaction", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);
    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });
    const fromAcc = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: "from",
      currency: "USD",
      type: "bank",
    });
    const toAcc = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: "to",
      currency: "USD",
      type: "bank",
    });

    const transfer = await createTransfer(serviceRoleClient, {
      organizationId: organization.id,
      fromAccountId: fromAcc.id,
      toAccountId: toAcc.id,
      categoryId: category.id,
      amount: 10,
      exchangeRate: 1,
      currencyFrom: "USD",
      currencyTo: "USD",
      date: "2025-08-01",
    });

    await deleteTransaction(serviceRoleClient, organization.id, transfer.from.id);

    await signInTestUser(user.email, user.password);
    const txs = await anonTestClient
      .from("transactions")
      .select("id, transfer_id")
      .eq("organization_id", organization.id);

    expect(txs.data?.find((t) => t.id === transfer.from.id)).toBeUndefined();
    expect(txs.data?.find((t) => t.id === transfer.to.id)).toBeDefined();

    await anonTestClient.auth.signOut();
    await cleanupTestArtifacts({ organizationId: organization.id, userId: user.id });
  });

  it("blocks non-member from reading/creating data in another org", async () => {
    const owner = await createTestUser();
    const org = await createOrganizationForUser(owner.id);
    const outsider = await createTestUser();
    const outsiderOrg = await createOrganizationForUser(outsider.id);

    const category = await createCategory(serviceRoleClient, {
      organizationId: org.id,
      name: "rls-cat",
    });
    const account = await createAccount(serviceRoleClient, {
      organizationId: org.id,
      name: "rls-acc",
      currency: "USD",
      type: "bank",
    });

    await signInTestUser(outsider.email, outsider.password);

    const listCats = await anonTestClient
      .from("categories")
      .select("id")
      .eq("organization_id", org.id);
    expect(listCats.data).toEqual([]);

    const insertBudget = await anonTestClient.from("budgets").insert({
      organization_id: org.id,
      month: "2025-09",
      category_id: category.id,
      amount: 1,
      currency: "USD",
    });
    expect(insertBudget.error).toBeTruthy();

    const insertTx = await anonTestClient.from("transactions").insert({
      organization_id: org.id,
      account_id: account.id,
      category_id: category.id,
      type: "expense",
      amount: 1,
      currency: "USD",
      date: "2025-09-01",
      exchange_rate: 1,
    });
    expect(insertTx.error).toBeTruthy();

    await anonTestClient.auth.signOut();

    await cleanupTestArtifacts({ organizationId: org.id, userId: owner.id });
    await cleanupTestArtifacts({ organizationId: outsiderOrg.id, userId: outsider.id });
  });
});
