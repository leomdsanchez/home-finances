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
    try {
      const body = await req.json();
      organizationId = body?.organizationId;
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
      .select("base_currency")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgError || !org) {
      console.error("balance: org fetch error", orgError);
      return jsonResponse(400, { error: orgError?.message ?? "Organization not found" });
    }

    const baseCurrency = (org.base_currency as string).toUpperCase();

    console.log("balance: before rates query");
    const { data: rateRows, error: ratesError } = await supabase
      .from("org_exchange_defaults")
      .select("from_currency, to_currency, rate")
      .eq("organization_id", organizationId);

    if (ratesError) {
      console.error("balance: rates error", ratesError);
      return jsonResponse(400, { error: ratesError.message });
    }

    const rates: ExchangeDefault[] =
      rateRows?.map((r) => ({
        fromCurrency: (r.from_currency as string).toUpperCase(),
        toCurrency: (r.to_currency as string).toUpperCase(),
        rate: Number(r.rate),
      })) ?? [];

    console.log("balance: before accounts query");
    const { data: accountsRows, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name, currency")
      .eq("organization_id", organizationId);

    if (accountsError) {
      console.error("balance: accounts error", accountsError);
      return jsonResponse(400, { error: accountsError.message });
    }

    console.log("balance: before totals query");
    const { data: txRows, error: txError } = await supabase
      .from("transactions")
      .select("currency, type, amount, account_id")
      .eq("organization_id", organizationId);

    if (txError) {
      console.error("balance: totals error", txError);
      return jsonResponse(400, { error: txError.message });
    }

    // agrupa em memória (evita group() não suportado pelo client)
    const totalsMap = new Map<string, { currency: string; type: "income" | "expense"; sum: number }>();
    (txRows ?? []).forEach((row) => {
      const currency = (row.currency || "").toUpperCase();
      const type = row.type === "income" ? "income" : "expense";
      const amount = Number(row.amount) || 0;
      if (!currency) return;
      const key = `${currency}-${type}`;
      const current = totalsMap.get(key) ?? { currency, type, sum: 0 };
      current.sum += amount;
      totalsMap.set(key, current);
    });
    const totalsRows = Array.from(totalsMap.values());

    let totalBase = 0;
    let missingRate = false;
    const accountMap = new Map<string, AccountSummary>();

    // inicializa contas com 0
    (accountsRows ?? []).forEach((acc) => {
      const currency = (acc.currency || "").toUpperCase();
      if (!acc.id || !currency) return;
      accountMap.set(acc.id, {
        accountId: acc.id as string,
        accountName: (acc.name as string) ?? null,
        currency,
        income: 0,
        expense: 0,
        balance: 0,
        balanceInBase: 0,
      });
    });

    (totalsRows as TotalsRow[] | null)?.forEach((row) => {
      const currency = (row.currency || "").toUpperCase();
      const sum = Number(row.sum) || 0;
      const signed = row.type === "income" ? sum : -sum;

      if (!currency) return;

      if (currency === baseCurrency) {
        totalBase += signed;
        return;
      }

      const { rate } = findRateToBase(baseCurrency, currency, rates);

      if (!rate) {
        missingRate = true;
        return;
      }

      totalBase += signed * rate; // converte destino -> base
    });

    // detalha por conta com conversão
    (txRows ?? []).forEach((row) => {
      const accountId = row.account_id as string | null;
      const currency = (row.currency || "").toUpperCase();
      const amount = Number(row.amount) || 0;
      const type = row.type === "income" ? "income" : "expense";
      if (!accountId || !currency) return;

      const acc = accountMap.get(accountId);
      if (!acc) {
        // conta não listada? cria entrada ad-hoc
        accountMap.set(accountId, {
          accountId,
          accountName: null,
          currency,
          income: 0,
          expense: 0,
          balance: 0,
          balanceInBase: 0,
        });
      }
      const summary = accountMap.get(accountId)!;
      if (type === "income") {
        summary.income += amount;
        summary.balance += amount;
      } else {
        summary.expense += amount;
        summary.balance -= amount;
      }

      if (currency === baseCurrency) {
        summary.balanceInBase += type === "income" ? amount : -amount;
        return;
      }
      const { rate } = findRateToBase(baseCurrency, currency, rates);
      if (!rate) {
        missingRate = true;
        return;
      }
      const signed = type === "income" ? amount : -amount;
      summary.balanceInBase += signed * rate;
    });

    const accounts = Array.from(accountMap.values());
    const totalAccountsBase = accounts.reduce((acc, a) => acc + a.balanceInBase, 0);

    console.log("balance: computed", {
      baseCurrency,
      totalBase,
      missingRate,
      rows: totalsRows?.length ?? 0,
      accounts: accounts.length,
    });

    return jsonResponse(200, {
      balance: totalBase,
      baseCurrency,
      missingRate,
      accounts,
      totalAccountsBase,
    });
  } catch (err) {
    console.error("balance: unhandled error", err);
    return jsonResponse(500, {
      error: "Unhandled server error",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
