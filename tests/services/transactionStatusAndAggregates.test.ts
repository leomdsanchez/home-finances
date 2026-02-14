import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { anonTestClient, serviceRoleClient } from "../setup/testEnv";
import {
  cleanupTestArtifacts,
  createOrganizationForUser,
  createTestUser,
  signInTestUser,
} from "../setup/testDataFactory";
import { createAccount } from "../../src/services/accountService";
import { createCategory } from "../../src/services/categoryService";
import {
  createTransaction,
  createTransfer,
  updateTransferStatus,
} from "../../src/services/transactionService";

describe("transaction status + aggregates (RPC)", () => {
  it("list_account_balances ignores 'previsto' transactions", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const account = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-${randomUUID()}`,
      currency: "USD",
      type: "bank",
    });
    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });

    await createTransaction(serviceRoleClient, {
      organizationId: organization.id,
      accountId: account.id,
      categoryId: category.id,
      type: "income",
      status: "realizado",
      amount: 100,
      currency: "USD",
      date: "2026-02-01",
      note: "realized income",
      transferId: null,
      exchangeRate: 1,
    });

    await createTransaction(serviceRoleClient, {
      organizationId: organization.id,
      accountId: account.id,
      categoryId: category.id,
      type: "income",
      status: "previsto",
      amount: 50,
      currency: "USD",
      date: "2026-02-02",
      note: "planned income",
      transferId: null,
      exchangeRate: 1,
    });

    try {
      await signInTestUser(user.email, user.password);

      const { data, error } = await anonTestClient.rpc("list_account_balances", {
        p_org_id: organization.id,
      });
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        account_id: string;
        balance: number | string | null;
      }>;
      const accRow = rows.find((r) => r.account_id === account.id);
      expect(Number(accRow?.balance ?? 0)).toBe(100);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({ organizationId: organization.id, userId: user.id });
    }
  });

  it("list_month_expense_totals ignores 'previsto' and excludes transfers", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const account = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-${randomUUID()}`,
      currency: "USD",
      type: "bank",
    });
    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });

    // Within Feb/2026 (should count)
    await createTransaction(serviceRoleClient, {
      organizationId: organization.id,
      accountId: account.id,
      categoryId: category.id,
      type: "expense",
      status: "realizado",
      amount: 30,
      currency: "USD",
      date: "2026-02-05",
      note: "realized expense",
      transferId: null,
      exchangeRate: 1,
    });

    // Within Feb/2026 but planned (should NOT count)
    await createTransaction(serviceRoleClient, {
      organizationId: organization.id,
      accountId: account.id,
      categoryId: category.id,
      type: "expense",
      status: "previsto",
      amount: 40,
      currency: "USD",
      date: "2026-02-06",
      note: "planned expense",
      transferId: null,
      exchangeRate: 1,
    });

    // Within Feb/2026 but transfer leg (should NOT count)
    await createTransaction(serviceRoleClient, {
      organizationId: organization.id,
      accountId: account.id,
      categoryId: category.id,
      type: "expense",
      status: "realizado",
      amount: 10,
      currency: "USD",
      date: "2026-02-07",
      note: "transfer leg",
      transferId: randomUUID(),
      exchangeRate: 1,
    });

    // Outside Feb/2026 (should NOT count)
    await createTransaction(serviceRoleClient, {
      organizationId: organization.id,
      accountId: account.id,
      categoryId: category.id,
      type: "expense",
      status: "realizado",
      amount: 99,
      currency: "USD",
      date: "2026-01-31",
      note: "previous month",
      transferId: null,
      exchangeRate: 1,
    });

    try {
      await signInTestUser(user.email, user.password);

      const { data, error } = await anonTestClient.rpc("list_month_expense_totals", {
        p_org_id: organization.id,
        p_month: "2026-02-14",
      });
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        category_id: string | null;
        currency: string;
        total: number | string | null;
      }>;
      const catRow = rows.find((r) => r.category_id === category.id);
      expect(catRow?.currency).toBe("USD");
      expect(Number(catRow?.total ?? 0)).toBe(30);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({ organizationId: organization.id, userId: user.id });
    }
  });

  it("updateTransferStatus updates both legs of a transfer", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);

    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });
    const accountFrom = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-from-${randomUUID()}`,
      currency: "USD",
      type: "bank",
    });
    const accountTo = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-to-${randomUUID()}`,
      currency: "USD",
      type: "bank",
    });

    const transfer = await createTransfer(serviceRoleClient, {
      organizationId: organization.id,
      fromAccountId: accountFrom.id,
      toAccountId: accountTo.id,
      categoryId: category.id,
      amount: 10,
      exchangeRate: 1,
      currencyFrom: "USD",
      currencyTo: "USD",
      date: "2026-02-10",
      note: "transfer status",
    });

    await updateTransferStatus(serviceRoleClient, {
      organizationId: organization.id,
      transferId: transfer.from.transferId!,
      status: "previsto",
    });

    try {
      await signInTestUser(user.email, user.password);

      const { data, error } = await anonTestClient
        .from("transactions")
        .select("id, transfer_id, status")
        .eq("organization_id", organization.id)
        .eq("transfer_id", transfer.from.transferId!);

      if (error) throw error;

      const rows = (data ?? []) as Array<{
        id: string;
        transfer_id: string | null;
        status: "realizado" | "previsto";
      }>;

      expect(rows.length).toBe(2);
      expect(rows.every((t) => t.status === "previsto")).toBe(true);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({ organizationId: organization.id, userId: user.id });
    }
  });
});

