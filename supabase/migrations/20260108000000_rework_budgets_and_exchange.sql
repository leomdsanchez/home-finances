-- Remover a coluna month de budgets e garantir unicidade por organização + categoria.
alter table budgets drop column if exists month;

-- Impedir duplicidade de orçamento por categoria (e um único orçamento geral).
drop index if exists budgets_org_category_idx;
create unique index if not exists budgets_org_category_unique
  on budgets (organization_id, category_id)
  where category_id is not null;
create unique index if not exists budgets_org_general_unique
  on budgets (organization_id)
  where category_id is null;

-- Tabela para taxas de câmbio padrão por organização.
create table if not exists org_exchange_defaults (
  organization_id uuid not null references organizations(id) on delete cascade,
  from_currency text not null,
  to_currency text not null,
  rate numeric not null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, from_currency, to_currency)
);

alter table org_exchange_defaults enable row level security;

-- Permitir que membros da organização gerenciem suas taxas.
create policy if not exists org_exchange_defaults_select on org_exchange_defaults
  for select using (
    exists (
      select 1 from organization_members om
      where om.organization_id = org_exchange_defaults.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy if not exists org_exchange_defaults_write on org_exchange_defaults
  for all using (
    exists (
      select 1 from organization_members om
      where om.organization_id = org_exchange_defaults.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from organization_members om
      where om.organization_id = org_exchange_defaults.organization_id
        and om.user_id = auth.uid()
    )
  );
