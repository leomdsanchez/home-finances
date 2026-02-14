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
  - Não coloque credenciais sensíveis com prefixo `VITE_` (Vite expõe no bundle do frontend).
- Supabase Edge Functions (IA voz/imagem):
  - `OPENAI_API_KEY=<openai key>` (configurar via `supabase secrets set ...`; ver `docs/AI_SETUP.md`)
  - (opcional) `OPENAI_CHAT_MODEL=gpt-4o-mini`
- `.env.test` (testes Vitest):
  - `SUPABASE_URL=https://qonkdzfrlnpjdpesgtcj.supabase.co`
  - `SUPABASE_ANON_KEY=<anon key>`
  - `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
  - (opcional) `SUPABASE_TEST_PASSWORD=<senha fixa para os usuários de teste>`
- (opcional) Migrações sem CLI:
  - `SUPABASE_DB_PASSWORD=<senha do Postgres do projeto>` (use com `python3 scripts/apply_migrations.py`; ver `docs/MIGRATION.md`)
- Não commitar essas chaves; elas vêm do dashboard do Supabase.

## Comandos essenciais
- Rodar testes de integração: `npm test` (usa o projeto cloud, executa em série e faz cleanup dos dados criados).
