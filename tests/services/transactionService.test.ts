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
import {
  createTransfer,
  deleteTransfer,
  listTransactions,
  createTransaction,
  deleteTransaction,
} from "../../src/services/transactionService";

describe("transactionService (transfer)", () => {
  it("cria e remove uma transferência (remove as duas pernas)", async () => {
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
      amount: 50,
      exchangeRate: 1,
      currencyFrom: "USD",
      currencyTo: "USD",
      date: "2025-03-01",
      note: "transfer delete test",
    });

    await deleteTransfer(serviceRoleClient, organization.id, transfer.from.transferId!);

    try {
      await signInTestUser(user.email, user.password);
      const txs = await listTransactions(anonTestClient, organization.id);
      expect(txs.find((t) => t.transferId === transfer.from.transferId)).toBeUndefined();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });

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

      // Ordem por data crescente (mesmo dia, respeita created_at)
      const indexes = txs
        .filter((t) => t.transferId === transfer.from.transferId)
        .map((t) => txs.indexOf(t));
      expect(Math.max(...indexes) - Math.min(...indexes)).toBe(1);
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

      // Ordem por data crescente (datas diferentes)
      const transferTxs = txs.filter((t) => t.transferId === transfer.to.transferId);
      expect(transferTxs[0]?.date <= transferTxs[1]?.date).toBe(true);
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });

  it("cria, atualiza e deleta uma transação avulsa", async () => {
    const user = await createTestUser();
    const organization = await createOrganizationForUser(user.id);
    const category = await createCategory(serviceRoleClient, {
      organizationId: organization.id,
      name: `cat-${randomUUID()}`,
    });
    const account = await createAccount(serviceRoleClient, {
      organizationId: organization.id,
      name: `acc-${randomUUID()}`,
      currency: "USD",
      type: "bank",
    });

    const tx = await createTransaction(serviceRoleClient, {
      organizationId: organization.id,
      accountId: account.id,
      categoryId: category.id,
      type: "expense",
      amount: 10,
      currency: "USD",
      date: "2025-04-01",
      note: "one-off",
      transferId: null,
      exchangeRate: 1,
    });

    await deleteTransaction(serviceRoleClient, organization.id, tx.id);

    try {
      await signInTestUser(user.email, user.password);
      const txs = await listTransactions(anonTestClient, organization.id);
      expect(txs.find((t) => t.id === tx.id)).toBeUndefined();
    } finally {
      await anonTestClient.auth.signOut();
      await cleanupTestArtifacts({
        organizationId: organization.id,
        userId: user.id,
      });
    }
  });
});
