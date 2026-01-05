# DEV_SETUP

## Requisitos
- Projeto Supabase na cloud (recomendado criar um projeto só para dev/testes).
- Node + npm.
- Supabase CLI opcional (somente se quiser aplicar migrations via CLI).

## Preparar o banco (uma vez)
- Abra o SQL Editor do projeto Supabase cloud e rode, em ordem, os arquivos de `supabase/migrations` (começando por `20260105000000_init_finance_schema.sql` e incluindo os ajustes posteriores como `20260106000000_fix_org_member_policies.sql`) para criar tabelas/RLS e políticas atualizadas.
- Alternativa via CLI (sem Docker): `supabase db push --db-url "<connection-string>"` usando o connection string do projeto.

## Variáveis de ambiente
- `.env` (app Vite):
  - `VITE_SUPABASE_URL=https://qonkdzfrlnpjdpesgtcj.supabase.co` (projeto fixo)
  - `VITE_SUPABASE_ANON_KEY=<anon key do projeto>`
- `.env.test` (testes Vitest):
  - `SUPABASE_URL=https://qonkdzfrlnpjdpesgtcj.supabase.co`
  - `SUPABASE_ANON_KEY=<anon key>`
  - `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
  - (opcional) `SUPABASE_TEST_PASSWORD=<senha fixa para os usuários de teste>`
- Não commitar essas chaves; elas vêm do dashboard do Supabase.

## Comandos essenciais
- Rodar testes de integração: `npm test` (usa o projeto cloud e faz cleanup dos dados criados).
