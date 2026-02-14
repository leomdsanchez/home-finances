import type { Account, Category } from "../types/domain";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";

export type AiTransactionSuggestion = {
  type: "expense" | "income";
  status?: "realizado" | "previsto";
  accountId: string | null;
  categoryId?: string | null;
  amount: number | null;
  date?: string | null; // YYYY-MM-DD
  note?: string | null;
  confidence?: number | null;
  warnings?: string[];
};

type Context = {
  token: string;
  organizationId: string;
  today: string; // YYYY-MM-DD
  accounts: Account[];
  categories: Category[];
};

const toAccountContext = (accounts: Account[]) =>
  accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }));

const toCategoryContext = (categories: Category[]) =>
  categories.map((c) => ({ id: c.id, name: c.name }));

const parseJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const invokeAiFunction = async (
  name: "ai-transaction-audio" | "ai-transaction-image",
  token: string,
  body: FormData,
) => {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Falha ao chamar a Edge Function (${name}). Verifique se ela está deployada e se há conexão. (${detail})`,
    );
  }

  const payload = await parseJson(res);
  if (!res.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Falha ao executar ${name} (HTTP ${res.status}).`;
    throw new Error(message);
  }
  return payload;
};

export const suggestTransactionFromAudio = async (
  params: Context & { audio: Blob; filename?: string },
): Promise<{ transcript: string; suggestion: AiTransactionSuggestion }> => {
  const fd = new FormData();
  fd.append("organizationId", params.organizationId);
  fd.append("today", params.today);
  fd.append("accounts", JSON.stringify(toAccountContext(params.accounts)));
  fd.append("categories", JSON.stringify(toCategoryContext(params.categories)));
  fd.append("file", params.audio, params.filename ?? "audio.webm");

  const payload = await invokeAiFunction("ai-transaction-audio", params.token, fd);
  return {
    transcript: String(payload?.transcript ?? ""),
    suggestion: payload?.suggestion as AiTransactionSuggestion,
  };
};

export const suggestTransactionFromImage = async (
  params: Context & { image: Blob; filename?: string },
): Promise<{ suggestion: AiTransactionSuggestion }> => {
  const fd = new FormData();
  fd.append("organizationId", params.organizationId);
  fd.append("today", params.today);
  fd.append("accounts", JSON.stringify(toAccountContext(params.accounts)));
  fd.append("categories", JSON.stringify(toCategoryContext(params.categories)));
  fd.append("file", params.image, params.filename ?? "image.jpg");

  const payload = await invokeAiFunction("ai-transaction-image", params.token, fd);
  return {
    suggestion: payload?.suggestion as AiTransactionSuggestion,
  };
};
