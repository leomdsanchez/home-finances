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

const parseJson = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

type ReasoningEffort = "low" | "medium" | "high";

const normalizeReasoningEffort = (raw: string | null): ReasoningEffort | null => {
  const v = raw?.trim().toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return null;
};

const isGpt5Model = (model: string) => model.trim().toLowerCase().startsWith("gpt-5");

const pickAccounts = (accounts: unknown) =>
  Array.isArray(accounts)
    ? accounts
        .map((a) => ({
          id: typeof a?.id === "string" ? a.id : null,
          name: typeof a?.name === "string" ? a.name : null,
          currency: typeof a?.currency === "string" ? a.currency : null,
        }))
        .filter((a) => a.id && a.name && a.currency)
    : [];

const pickCategories = (categories: unknown) =>
  Array.isArray(categories)
    ? categories
        .map((c) => ({
          id: typeof c?.id === "string" ? c.id : null,
          name: typeof c?.name === "string" ? c.name : null,
        }))
        .filter((c) => c.id && c.name)
    : [];

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const callChatVision = async (
  openaiKey: string,
  params: {
    image: File;
    today: string;
    userName: string | null;
    organizationMemberCount: number | null;
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string }>;
  },
) => {
  const model = Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o-mini";
  const reasoningEffort = normalizeReasoningEffort(Deno.env.get("OPENAI_REASONING_EFFORT"));

  const prompt = [
    "Extraia um lançamento financeiro a partir de uma imagem (ex.: recibo).",
    "Retorne um JSON válido e somente JSON.",
    "",
    "Regras:",
    "- type deve ser 'expense' ou 'income' (default: expense).",
    "- status deve ser: 'realizado' ou 'previsto' (default: 'realizado').",
    "- Use APENAS accountId e categoryId presentes nas listas fornecidas.",
    "- Se não conseguir determinar valor/conta, use null e inclua warnings.",
    "- date deve ser YYYY-MM-DD (default: TODAY).",
    "- note deve ser SOMENTE a descrição do gasto/receita (ex.: nome do local/loja), sem incluir valor/moeda, conta, data ou pessoa.",
    "- Nunca repita o total/valor em note. Se houver números em note, eles devem ser parte do nome (ex.: 7-Eleven), nunca o total do recibo.",
    "- Antes de responder, confira: note não contém R$, US$, BRL, USD, nem palavras como 'reais'/'dólares' junto de números; se contiver, remova essas partes e se não sobrar descrição, use null.",
    "- Você receberá userName e o número de membros da organização apenas como contexto para interpretar \"minha conta\".",
    "",
    "Exemplos (recibo -> saída):",
    '1) Recibo de SUPERMERCADO XYZ com TOTAL 120,00 -> note="SUPERMERCADO XYZ", amount=120.00',
    '2) Recibo com apenas TOTAL 32,00 e sem nome legível -> note=null, amount=32.00, warnings inclui motivo',
  ].join("\n");

  const bytes = new Uint8Array(await params.image.arrayBuffer());
  const base64 = bytesToBase64(bytes);
  const mime = params.image.type || "image/jpeg";
  const dataUrl = `data:${mime};base64,${base64}`;

  const textPayload = JSON.stringify({
    userName: params.userName,
    organizationMembers: params.organizationMemberCount,
    today: params.today,
    accounts: params.accounts,
    categories: params.categories,
    output: {
      type: "'expense' | 'income'",
      status: "'realizado' | 'previsto' (default: 'realizado')",
      accountId: "string | null",
      categoryId: "string | null",
      amount: "number | null",
      date: "YYYY-MM-DD | null",
      note: "string | null (descricao apenas; nunca repetir valor/moeda/conta/data/pessoa)",
      confidence: "number (0..1) | null",
      warnings: "string[]",
    },
  });

  const body: Record<string, unknown> = {
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "developer", content: prompt },
      {
        role: "user",
        content: [
          { type: "text", text: textPayload },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    // gpt-5.x models require max_completion_tokens (max_tokens is rejected).
    max_completion_tokens: 500,
  };

  // gpt-5.x models currently don't support setting temperature=0 (only default value).
  if (!isGpt5Model(model)) {
    body.temperature = 0;
  }

  if (reasoningEffort && isGpt5Model(model)) {
    body.reasoning_effort = reasoningEffort;
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    const message = payload?.error?.message ?? payload?.message ?? "Chat completion failed";
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Invalid chat response");
  }

  const parsed = parseJson(content);
  if (!parsed) {
    throw new Error("Failed to parse model JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid model JSON");
  }
  return parsed;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    // Supabase Edge Functions typically expose SUPABASE_* vars by default.
    // Keep FUNCTION_SUPABASE_* as fallback for local/dev setups that rely on them.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("FUNCTION_SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("FUNCTION_SUPABASE_ANON_KEY");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("FUNCTION_SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !openaiKey) {
      console.error("ai-transaction-image: missing env", {
        supabaseUrl: !!supabaseUrl,
        anonKey: !!anonKey,
        serviceRoleKey: !!serviceRoleKey,
        openaiKey: !!openaiKey,
      });
      return jsonResponse(500, { error: "Server misconfigured" });
    }

    const rawAuth = req.headers.get("authorization") ?? "";
    const [scheme, token] = rawAuth.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return jsonResponse(401, { error: "Missing/invalid Authorization header" });
    }

    const authClient = createClient(supabaseUrl, anonKey || serviceRoleKey);
    const { data: userResult, error: userError } = await authClient.auth.getUser(token);
    const userId = userResult?.user?.id ?? null;
    if (userError || !userId) {
      console.error("ai-transaction-image: auth error", userError);
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const userNameRaw = (userResult?.user?.user_metadata as Record<string, unknown> | null)?.name;
    const userName =
      typeof userNameRaw === "string" && userNameRaw.trim().length > 0 ? userNameRaw.trim() : null;

    const form = await req.formData();
    const organizationId = form.get("organizationId");
    const today = form.get("today");
    const file = form.get("file");
    const accountsJson = form.get("accounts");
    const categoriesJson = form.get("categories");

    if (!organizationId || typeof organizationId !== "string") {
      return jsonResponse(400, { error: "organizationId is required" });
    }
    if (!today || typeof today !== "string") {
      return jsonResponse(400, { error: "today is required" });
    }
    if (!(file instanceof File)) {
      return jsonResponse(400, { error: "file is required" });
    }

    const accounts = pickAccounts(parseJson(typeof accountsJson === "string" ? accountsJson : null));
    const categories = pickCategories(
      parseJson(typeof categoriesJson === "string" ? categoriesJson : null),
    );

    if (accounts.length === 0) {
      return jsonResponse(400, { error: "accounts is required" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error("ai-transaction-image: membership error", membershipError);
      return jsonResponse(400, { error: membershipError.message });
    }
    if (!membership) {
      return jsonResponse(403, { error: "Not authorized for this organization" });
    }

    let organizationMemberCount: number | null = null;
    try {
      const { count, error: countError } = await supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      if (countError) {
        console.error("ai-transaction-image: member count error", countError);
      } else if (typeof count === "number") {
        organizationMemberCount = count;
      }
    } catch (err) {
      console.error("ai-transaction-image: member count threw", err);
    }

    const structured = await callChatVision(openaiKey, {
      image: file,
      today,
      userName,
      organizationMemberCount,
      accounts,
      categories,
    });

    return jsonResponse(200, { suggestion: structured });
  } catch (err) {
    console.error("ai-transaction-image: unhandled error", err);
    return jsonResponse(500, {
      error: "Unhandled server error",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
