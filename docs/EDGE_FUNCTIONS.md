# Deploy de Edge Functions (Supabase)

## Pré-requisitos
- Supabase CLI instalada (`npm i -g supabase` ou via brew).
- Projeto inicializado (pasta `supabase/` com `config.toml`).
- Variáveis de ambiente:
  - `SUPABASE_ACCESS_TOKEN` (token pessoal da CLI com permissão de deploy).
  - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (usadas nas funções, setar em secrets).
- Docker opcional (a CLI avisa se não estiver rodando; para deploy simples não é obrigatório).

## Estrutura
- Cada função fica em `supabase/functions/<nome>/index.ts`.
- Exemplo: `supabase/functions/balance/index.ts`.

## Configurar secrets no projeto (uma vez)
```sh
supabase secrets set \
  SUPABASE_URL=$SUPABASE_URL \
  SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
```

## Deploy
Com o token já disponível em `SUPABASE_ACCESS_TOKEN`:
```sh
supabase functions deploy <nome-da-funcao>
```
Exemplo:
```sh
supabase functions deploy balance
```

## Testar função deployada
- Invocar passando o `organizationId` (exemplo):
```sh
supabase functions invoke balance --data '{"organizationId": "<org-id>"}'
```
- Se quiser testar sem exigir JWT:
```sh
supabase functions invoke balance --no-verify-jwt --data '{"organizationId": "<org-id>"}'
```
(para produção, use JWT válido do usuário).

## Dicas
- Se a CLI reclamar de token: garanta `SUPABASE_ACCESS_TOKEN` ou rode `supabase login`.
- Logs e estado do deploy podem ser vistos no Dashboard Supabase: Functions > <nome>.
- Para atualizar, edite o `index.ts` da função e rode o deploy novamente.
