import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExchangeDefault } from "../types/domain";

type ExchangeRow = {
  organization_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  spread_pct: number;
  updated_at: string;
};

const mapRow = (row: ExchangeRow): ExchangeDefault => ({
  organizationId: row.organization_id,
  fromCurrency: row.from_currency,
  toCurrency: row.to_currency,
  rate: row.rate,
  spreadPct: row.spread_pct,
  updatedAt: row.updated_at,
});

export const listExchangeDefaults = async (
  client: SupabaseClient,
  organizationId: string
): Promise<ExchangeDefault[]> => {
  const { data, error } = await client
    .from("org_exchange_defaults")
    .select("organization_id, from_currency, to_currency, rate, spread_pct, updated_at")
    .eq("organization_id", organizationId)
    .order("from_currency", { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to list exchange defaults: ${error?.message ?? "unknown"}`);
  }

  return data.map(mapRow);
};

export const upsertExchangeDefault = async (
  client: SupabaseClient,
  params: {
    organizationId: string;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    spreadPct?: number;
  }
): Promise<ExchangeDefault> => {
  const { organizationId, fromCurrency, toCurrency, rate, spreadPct = 0 } = params;
  const { data, error } = await client
    .from("org_exchange_defaults")
    .upsert(
      {
        organization_id: organizationId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
        spread_pct: spreadPct,
      },
      { onConflict: "organization_id,from_currency,to_currency" }
    )
    .select("organization_id, from_currency, to_currency, rate, spread_pct, updated_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save exchange default: ${error?.message ?? "unknown"}`);
  }

  return mapRow(data);
};

export const deleteExchangeDefault = async (
  client: SupabaseClient,
  params: { organizationId: string; fromCurrency: string; toCurrency: string }
): Promise<void> => {
  const { organizationId, fromCurrency, toCurrency } = params;
  const { error } = await client
    .from("org_exchange_defaults")
    .delete()
    .eq("organization_id", organizationId)
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency);

  if (error) {
    throw new Error(`Failed to delete exchange default: ${error.message}`);
  }
};
