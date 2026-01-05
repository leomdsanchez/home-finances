# ARCHITECTURE

## Organização como unidade
- Toda permissão nasce da tabela `organization_members`, que liga `auth.users` às `organizations`.
- Não existe conceito de role por enquanto: ser membro concede acesso total às entidades da organização.
- Cada tabela de domínio pertence a uma organização (accounts, categories, transactions, budgets, etc.), garantindo isolamento por membership via RLS.

## Estrutura de código
- `src/types`: contratos de domínio em camelCase.
- `src/mappers`: conversão DB ↔ domínio (snake_case ↔ camelCase).
- `src/lib`: infraestrutura compartilhada (ex.: client Supabase).
- `src/services`: espaço reservado para serviços reais (I/O) fora da UI.
- `tests`: testes de integração contra o Supabase local, usando o service role para preparar dados e sessão de usuário real para assertivas.
