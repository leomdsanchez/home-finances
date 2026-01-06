/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?dts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

type ExchangeDefault = {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

type TotalsRow = {
  currency: string;
  type: "income" | "expense";
  sum: number;
};

serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let organizationId: string | undefined;
  try {
    const body = await req.json();
    organizationId = body?.organizationId;
  } catch (_err) {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!organizationId || typeof organizationId !== "string") {
    return jsonResponse(400, { error: "organizationId is required" });
  }

  // RLS guard: ensure user is member of the org
  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (membershipError) {
    return jsonResponse(400, { error: membershipError.message });
  }
  if (!memberships || memberships.length === 0) {
    return jsonResponse(403, { error: "Not authorized for this organization" });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("base_currency")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError || !org) {
    return jsonResponse(400, { error: orgError?.message ?? "Organization not found" });
  }

  const baseCurrency = (org.base_currency as string).toUpperCase();

  const { data: rateRows, error: ratesError } = await supabase
    .from("org_exchange_defaults")
    .select("from_currency, to_currency, rate")
    .eq("organization_id", organizationId);

  if (ratesError) {
    return jsonResponse(400, { error: ratesError.message });
  }

  const rates: ExchangeDefault[] =
    rateRows?.map((r) => ({
      fromCurrency: (r.from_currency as string).toUpperCase(),
      toCurrency: (r.to_currency as string).toUpperCase(),
      rate: Number(r.rate),
    })) ?? [];

  const { data: totalsRows, error: totalsError } = await supabase
    .from("transactions")
    .select("currency, type, sum:sum(amount)")
    .eq("organization_id", organizationId)
    .group("currency, type");

  if (totalsError) {
    return jsonResponse(400, { error: totalsError.message });
  }

  let totalBase = 0;
  let missingRate = false;

  (totalsRows as TotalsRow[] | null)?.forEach((row) => {
    const currency = row.currency.toUpperCase();
    const sum = Number(row.sum) || 0;
    const signed = row.type === "income" ? sum : -sum;

    if (currency === baseCurrency) {
      totalBase += signed;
      return;
    }

    const rate = rates.find(
      (r) => r.fromCurrency === baseCurrency && r.toCurrency === currency,
    );

    if (!rate) {
      missingRate = true;
      return;
    }

    totalBase += signed * rate.rate;
  });

  return jsonResponse(200, {
    balance: totalBase,
    baseCurrency,
    missingRate,
  });
});
