# Deploy de Edge Functions (Supabase)

## Pré-requisitos
- Supabase CLI instalada (`npm i -g supabase` ou via brew).
- Projeto inicializado (pasta `supabase/` com `config.toml`).
- Variáveis de ambiente:
  - `SUPABASE_ACCESS_TOKEN` (token pessoal da CLI com permissão de deploy).
  - (se aplicável) secrets das funções, ex.: `OPENAI_API_KEY` (ver `docs/AI_SETUP.md`).
- Docker opcional (a CLI avisa se não estiver rodando; para deploy simples não é obrigatório).

## Estrutura
- Cada função fica em `supabase/functions/<nome>/index.ts`.
- Exemplo: `supabase/functions/balance/index.ts`.

## Configurar secrets no projeto (quando necessário)
Obs: no runtime do Supabase, as Edge Functions normalmente já recebem `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` automaticamente, e esses nomes são reservados (não setar via `supabase secrets set`).

Exemplo (IA):
```sh
supabase secrets set \
  OPENAI_API_KEY="SUA_CHAVE" \
  OPENAI_CHAT_MODEL="gpt-5.2" \
  OPENAI_REASONING_EFFORT="high"
```

## Deploy
Com o token já disponível em `SUPABASE_ACCESS_TOKEN`:
```sh
supabase functions deploy <nome-da-funcao>
```
Exemplo:
```sh
supabase functions deploy balance --no-verify-jwt
```

Obs: se o gateway responder `Invalid JWT` ao chamar a função, é provável que seu projeto esteja emitindo JWT com chaves assimétricas (ex.: ES256). Neste projeto, as funções já validam o token internamente via `auth.getUser()`, então o deploy com `--no-verify-jwt` é o caminho recomendado.

## Testar função deployada
- Invocar via HTTP (exemplo):
```sh
curl -sS -X POST "$VITE_SUPABASE_URL/functions/v1/balance" \
  -H "Content-Type: application/json" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer <access_token_do_usuario>" \
  -d '{"organizationId": "<org-id>"}'
```
(para produção, use JWT válido do usuário).

## Dicas
- Se a CLI reclamar de token: garanta `SUPABASE_ACCESS_TOKEN` ou rode `supabase login`.
- Logs e estado do deploy podem ser vistos no Dashboard Supabase: Functions > <nome>.
- Para atualizar, edite o `index.ts` da função e rode o deploy novamente.
