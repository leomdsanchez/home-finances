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
  deleteExchangeDefault,
  listExchangeDefaults,
  upsertExchangeDefault,
} from "../../src/services/exchangeRateService";

const ORG_BASE = "USD";

describe("exchangeRateService", () => {
  it("creates, lists, updates and deletes exchange defaults with spread", async () => {
    const user = await createTestUser();
    const org = await createOrganizationForUser(user.id);

    // cria uma taxa
    const saved = await upsertExchangeDefault(serviceRoleClient, {
      organizationId: org.id,
      fromCurrency: ORG_BASE,
      toCurrency: "BRL",
      rate: 5.2,
      spreadPct: 1.5,
    });

    expect(saved.rate).toBe(5.2);
    expect(saved.spreadPct).toBe(1.5);

    // atualiza
    const updated = await upsertExchangeDefault(serviceRoleClient, {
      organizationId: org.id,
      fromCurrency: ORG_BASE,
      toCurrency: "BRL",
      rate: 5.1,
      spreadPct: 2,
    });

    expect(updated.rate).toBe(5.1);
    expect(updated.spreadPct).toBe(2);

    // lista como membro
    await signInTestUser(user.email, user.password);
    const list = await listExchangeDefaults(anonTestClient, org.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.toCurrency).toBe("BRL");
    expect(list[0]?.spreadPct).toBe(2);
    await anonTestClient.auth.signOut();

    // remove
    await deleteExchangeDefault(serviceRoleClient, {
      organizationId: org.id,
      fromCurrency: ORG_BASE,
      toCurrency: "BRL",
    });

    const afterDelete = await listExchangeDefaults(serviceRoleClient, org.id);
    expect(afterDelete).toHaveLength(0);

    await cleanupTestArtifacts({ organizationId: org.id, userId: user.id });
  });

  it("blocks non-member from reading exchange defaults", async () => {
    const owner = await createTestUser();
    const orgA = await createOrganizationForUser(owner.id);
    const outsider = await createTestUser();
    const orgB = await createOrganizationForUser(outsider.id);

    await upsertExchangeDefault(serviceRoleClient, {
      organizationId: orgA.id,
      fromCurrency: ORG_BASE,
      toCurrency: "EUR",
      rate: 0.9,
      spreadPct: 1,
    });

    await signInTestUser(outsider.email, outsider.password);
    const view = await listExchangeDefaults(anonTestClient, orgA.id);
    expect(view.length).toBe(0);
    await anonTestClient.auth.signOut();

    await cleanupTestArtifacts({ organizationId: orgA.id, userId: owner.id });
    await cleanupTestArtifacts({ organizationId: orgB.id, userId: outsider.id });
  });
});
