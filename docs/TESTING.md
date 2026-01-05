# TESTING

## Estratégia
- Testes de integração rodam contra o projeto Supabase na cloud para cobrir migrations, RLS e tipos reais.
- Cada teste cria e apaga seus próprios dados; não dependemos de fixtures manuais. Use um projeto separado de produção para evitar poluição de dados.

## Setup para rodar
1) Garantir que o projeto Supabase (ref `qonkdzfrlnpjdpesgtcj`) já tem o schema aplicado (rode todos os arquivos em `supabase/migrations`, na ordem, ex.: `20260105000000_init_finance_schema.sql` e `20260106000000_fix_org_member_policies.sql`).
2) Preencher `.env.test` com `SUPABASE_URL=https://qonkdzfrlnpjdpesgtcj.supabase.co`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (pegar no dashboard do projeto).
3) Rodar `npm test` (Vitest executa em modo serial via `--sequence.concurrent false` e timeout 20s).

## Criação de dados de teste
- `tests/setup/testDataFactory.ts` expõe helpers para criar usuário de teste (`auth.admin.createUser`), criar organização com moeda base USD e vincular membership.
- O teste de smoke (`tests/bootstrap/bootstrap.test.ts`) faz o ciclo completo: cria usuário, cria organização, cria membership e consulta como o próprio usuário para validar que o vínculo existe.
- Os testes de serviço (`tests/services/organizationService.test.ts`) cobrem três fluxos separados: criar usuário sem org, criar org para um user e entrar em org existente.
- Testes de serviços adicionais cobrem contas (`tests/services/accountService.test.ts`), categorias (`tests/services/categoryService.test.ts`) e budgets (`tests/services/budgetService.test.ts`) criando e listando registros para a organização do usuário autenticado.
- `cleanupTestArtifacts` remove membership, organização e usuário criados, mantendo o banco limpo entre execuções.
