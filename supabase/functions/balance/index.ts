// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?dts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

type AccountSummary = {
  accountId: string;
  accountName: string | null;
  currency: string;
  income: number;
  expense: number;
  balance: number;
  balanceInBase: number;
};

const findRateToBase = (
  baseCurrency: string,
  currency: string,
  rates: ExchangeDefault[],
): { rate: number | null; inverted: boolean } => {
  const direct = rates.find(
    (r) => r.fromCurrency === baseCurrency && r.toCurrency === currency,
  );
  if (direct) return { rate: direct.rate, inverted: false };

  const inverse = rates.find(
    (r) => r.fromCurrency === currency && r.toCurrency === baseCurrency,
  );
  if (inverse && inverse.rate) return { rate: 1 / inverse.rate, inverted: true };

  return { rate: null, inverted: false };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("FUNCTION_SUPABASE_URL");
    const anonKey = Deno.env.get("FUNCTION_SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("FUNCTION_SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("balance: missing env", {
        supabaseUrl: !!supabaseUrl,
        anonKey: !!anonKey,
        serviceRoleKey: !!serviceRoleKey,
      });
      return jsonResponse(500, { error: "Server misconfigured" });
    }

    const rawAuth = req.headers.get("authorization") ?? "";
    const [scheme, token] = rawAuth.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return jsonResponse(401, { error: "Missing/invalid Authorization header" });
    }

    // valida token de usuário
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userResult, error: userError } = await authClient.auth.getUser(token);
    const userId = userResult?.user?.id ?? null;
    if (userError || !userId) {
      console.error("balance: auth error", userError);
      return jsonResponse(401, { error: "Unauthorized" });
    }

    // cliente service role para consultas (bypass RLS, mas com checagem de membership)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let organizationId: string | undefined;
    let force = false;
    try {
      const body = await req.json();
      organizationId = body?.organizationId;
      force = Boolean(body?.force);
    } catch (err) {
      console.error("balance: invalid JSON body", err);
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    if (!organizationId || typeof organizationId !== "string") {
      return jsonResponse(400, { error: "organizationId is required" });
    }

    console.log("balance: before membership query", { organizationId, userId });
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error("balance: membership error", membershipError);
      return jsonResponse(400, { error: membershipError.message });
    }

    if (!membership) {
      return jsonResponse(403, { error: "Not authorized for this organization" });
    }

    console.log("balance: before org query");
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("base_currency, balance_value, balance_currency, balance_updated_at, balance_missing_rate")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgError || !org) {
      console.error("balance: org fetch error", orgError);
      return jsonResponse(400, { error: orgError?.message ?? "Organization not found" });
    }

    let balanceValue = org.balance_value as number | null;
    let balanceCurrency = (org.balance_currency as string | null)?.toUpperCase() ?? null;
    let balanceUpdatedAt = org.balance_updated_at as string | null;
    let balanceMissingRate = Boolean(org.balance_missing_rate);

    const shouldRecompute = force || balanceValue === null || !balanceCurrency;

    if (shouldRecompute) {
      console.log("balance: forcing recompute");
      const { data: recomputed, error: recomputeError } = await supabase.rpc("recompute_org_balance", {
        p_org_id: organizationId,
      });
      if (recomputeError) {
        console.error("balance: recompute error", recomputeError);
        return jsonResponse(400, { error: recomputeError.message });
      }
      const firstRow = Array.isArray(recomputed) ? recomputed[0] : recomputed;
      balanceValue = firstRow?.balance ?? balanceValue;
      balanceCurrency = firstRow?.base_currency?.toUpperCase?.() ?? balanceCurrency;
      balanceUpdatedAt = firstRow?.updated_at ?? balanceUpdatedAt;
      balanceMissingRate = Boolean(firstRow?.missing_rate ?? balanceMissingRate);
    }

    return jsonResponse(200, {
      balance: balanceValue,
      baseCurrency: balanceCurrency ?? (org.base_currency as string)?.toUpperCase(),
      missingRate: balanceMissingRate,
      updatedAt: balanceUpdatedAt,
      usedCache: !shouldRecompute,
    });
  } catch (err) {
    console.error("balance: unhandled error", err);
    return jsonResponse(500, {
      error: "Unhandled server error",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
