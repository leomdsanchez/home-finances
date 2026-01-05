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
import { createAccount } from "../../src/services/accountService";
import { createCategory } from "../../src/services/categoryService";
import { createTransfer, listTransactions } from "../../src/services/transactionService";

describe("transactionService (transfer)", () => {
  it("cria transferência na mesma moeda", async () => {
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
      amount: 100,
      exchangeRate: 1,
      currencyFrom: "USD",
      currencyTo: "USD",
      date: "2025-01-01",
      note: "transfer same currency",
    });

    try {
      await signInTestUser(user.email, user.password);
      const txs = await listTransactions(anonTestClient, organization.id);
      const fromTx = txs.find((t) => t.id === transfer.from.id);
      const toTx = txs.find((t) => t.id === transfer.to.id);

      expect(fromTx?.type).toBe("expense");
      expect(toTx?.type).toBe("income");
      expect(fromTx?.transferId).toBe(toTx?.transferId);
      expect(fromTx?.amount).toBe(100);
      expect(toTx?.amount).toBe(100);
      expect(fromTx?.currency).toBe("USD");
      expect(toTx?.currency).toBe("USD");
      expect(txs.map((t) => t.transferId)).toContain(transfer.from.transferId);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });

  it("cria transferência entre moedas diferentes", async () => {
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
      currency: "BRL",
      type: "bank",
    });

    const transfer = await createTransfer(serviceRoleClient, {
      organizationId: organization.id,
      fromAccountId: accountFrom.id,
      toAccountId: accountTo.id,
      categoryId: category.id,
      amount: 100, // USD
      exchangeRate: 5.2, // USD -> BRL
      currencyFrom: "USD",
      currencyTo: "BRL",
      date: "2025-02-01",
      note: "transfer fx",
    });

    try {
      await signInTestUser(user.email, user.password);
      const txs = await listTransactions(anonTestClient, organization.id);
      const fromTx = txs.find((t) => t.id === transfer.from.id);
      const toTx = txs.find((t) => t.id === transfer.to.id);

      expect(fromTx?.type).toBe("expense");
      expect(toTx?.type).toBe("income");
      expect(fromTx?.transferId).toBe(toTx?.transferId);
      expect(fromTx?.amount).toBe(100);
      expect(toTx?.amount).toBeCloseTo(520, 2);
      expect(fromTx?.exchangeRate).toBe(1);
      expect(toTx?.exchangeRate).toBeCloseTo(5.2, 2);
      expect(fromTx?.currency).toBe("USD");
      expect(toTx?.currency).toBe("BRL");
      expect(txs.map((t) => t.transferId)).toContain(transfer.to.transferId);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
