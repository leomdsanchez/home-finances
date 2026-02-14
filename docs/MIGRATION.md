# Migrações do Supabase (Cloud)

Fluxo rápido para aplicar novas migrações no projeto hospedado:

1) Garantir CLI logada e projeto linkado
   ```bash
   supabase login            # se ainda não tiver token salvo
   supabase link             # se não estiver linkado; usa project ref do .env
   ```
   O link já está configurado para `qonkdzfrlnpjdpesgtcj`. Se mudar o projeto, rode `supabase link --project-ref NOVO_REF`.

2) Rodar push das migrações
   ```bash
   supabase db push --yes
   ```
   - Use `--dry-run` se quiser só listar o que será aplicado.

3) Verificar saída
   - Se aparecer aviso `policy ... does not exist, skipping`, significa que o `drop policy if exists` não encontrou a política antiga (ok).
   - Qualquer erro de sintaxe ou RLS interrompe o push; corrija o SQL em `supabase/migrations` e repita.

## Sem Supabase CLI
Se você não tem `supabase` CLI/Node instalado, use uma das opções abaixo.

### Opção A: SQL Editor (manual)
1) Abra o SQL Editor do projeto no dashboard do Supabase.
2) Rode o conteúdo dos arquivos em `supabase/migrations/`, em ordem.

### Opção B: Python (psycopg2)
Requer `python3` e `psycopg2` (ou `psycopg2-binary`).

1) Garanta no `.env` (ou no ambiente) as variáveis:
   - `SUPABASE_URL` (ou `VITE_SUPABASE_URL`)
   - `SUPABASE_DB_PASSWORD` (ou `VITE_SUPABASE_DB_PASSWORD`)

2) Aplicar todas as migrations pendentes:
   ```bash
   python3 scripts/apply_migrations.py
   ```

3) Aplicar uma migration específica:
   ```bash
   python3 scripts/apply_migrations.py supabase/migrations/20260214000000_add_transaction_status_and_aggregates.sql
   ```

Notas:
- As migrações vivem em `supabase/migrations`. O push aplica apenas as que ainda não foram registradas na tabela de histórico do Supabase.
- Não exponha a service role key no frontend; o push usa a conexão gerenciada pelo CLI para o projeto cloud.
