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

const parseJson = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

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

const callWhisper = async (openaiKey: string, file: File): Promise<string> => {
  const fd = new FormData();
  fd.append("model", "whisper-1");
  fd.append("language", "pt");
  fd.append("file", file, file.name || "audio.webm");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
    },
    body: fd,
  });

  const payload = await resp.json().catch(() => null);
  if (!resp.ok) {
    const message = payload?.error?.message ?? payload?.message ?? "Transcription failed";
    throw new Error(message);
  }
  const text = payload?.text;
  if (!text || typeof text !== "string") {
    throw new Error("Invalid transcription response");
  }
  return text.trim();
};

const callChat = async (
  openaiKey: string,
  params: {
    transcript: string;
    today: string;
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string }>;
  },
) => {
  const model = Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o-mini";

  const prompt = [
    "Extraia um lançamento financeiro a partir de uma transcrição em português (pt-BR).",
    "Regras:",
    "- Use APENAS os accountId e categoryId presentes nas listas fornecidas.",
    "- Se não conseguir determinar conta/valor, retorne null nesses campos e inclua warnings.",
    "- type deve ser: 'expense' ou 'income'.",
    "- status deve ser: 'realizado' ou 'previsto' (default: 'realizado').",
    "- date no formato YYYY-MM-DD (default: TODAY).",
    "- note deve ser curta e clara.",
    "",
    "Responda SOMENTE com um JSON válido.",
  ].join("\n");

  const userPayload = {
    transcript: params.transcript,
    today: params.today,
    accounts: params.accounts,
    categories: params.categories,
    output: {
      type: "'expense' | 'income'",
      status: "'realizado' | 'previsto'",
      accountId: "string | null",
      categoryId: "string | null",
      amount: "number | null",
      date: "YYYY-MM-DD | null",
      note: "string | null",
      confidence: "number (0..1) | null",
      warnings: "string[]",
    },
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "developer", content: prompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
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
    const supabaseUrl = Deno.env.get("FUNCTION_SUPABASE_URL");
    const anonKey = Deno.env.get("FUNCTION_SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("FUNCTION_SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !openaiKey) {
      console.error("ai-transaction-audio: missing env", {
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

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userResult, error: userError } = await authClient.auth.getUser(token);
    const userId = userResult?.user?.id ?? null;
    if (userError || !userId) {
      console.error("ai-transaction-audio: auth error", userError);
      return jsonResponse(401, { error: "Unauthorized" });
    }

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
      console.error("ai-transaction-audio: membership error", membershipError);
      return jsonResponse(400, { error: membershipError.message });
    }
    if (!membership) {
      return jsonResponse(403, { error: "Not authorized for this organization" });
    }

    const transcript = await callWhisper(openaiKey, file);
    const structured = await callChat(openaiKey, {
      transcript,
      today,
      accounts,
      categories,
    });

    return jsonResponse(200, { transcript, suggestion: structured });
  } catch (err) {
    console.error("ai-transaction-audio: unhandled error", err);
    return jsonResponse(500, {
      error: "Unhandled server error",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

