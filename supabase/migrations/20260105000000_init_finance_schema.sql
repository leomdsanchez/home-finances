-- Enable required extensions
create extension if not exists "pgcrypto";

-- 1) Base tables
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- 2) Domain tables
create table accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  currency text not null,
  type text not null check (type in ('bank', 'card', 'cash', 'other')),
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete restrict,
  category_id uuid not null references categories(id) on delete restrict,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  currency text not null,
  date date not null,
  note text,
  transfer_id uuid,
  exchange_rate numeric not null default 1,
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  month text not null, -- YYYY-MM
  category_id uuid references categories(id) on delete set null,
  amount numeric not null,
  currency text not null
);

create table currencies (
  code text primary key,
  symbol text not null
);

-- 3) RLS
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;

-- Organizations
create policy organizations_select on organizations
  for select using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
    )
  );
create policy organizations_write on organizations
  for all using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.organization_id = organizations.id
        and om.user_id = auth.uid()
    )
  );

-- Organization members
create policy organization_members_select on organization_members
  for select using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
    )
  );
create policy organization_members_write on organization_members
  for all using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
    )
  );

-- Accounts
create policy accounts_select on accounts
  for select using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = accounts.organization_id
        and om.user_id = auth.uid()
    )
  );
create policy accounts_write on accounts
  for all using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = accounts.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.organization_id = accounts.organization_id
        and om.user_id = auth.uid()
    )
  );

-- Categories
create policy categories_select on categories
  for select using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = categories.organization_id
        and om.user_id = auth.uid()
    )
  );
create policy categories_write on categories
  for all using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = categories.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.organization_id = categories.organization_id
        and om.user_id = auth.uid()
    )
  );

-- Transactions
create policy transactions_select on transactions
  for select using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = transactions.organization_id
        and om.user_id = auth.uid()
    )
  );
create policy transactions_write on transactions
  for all using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = transactions.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.organization_id = transactions.organization_id
        and om.user_id = auth.uid()
    )
  );

-- Budgets
create policy budgets_select on budgets
  for select using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = budgets.organization_id
        and om.user_id = auth.uid()
    )
  );
create policy budgets_write on budgets
  for all using (
    exists (
      select 1
      from organization_members om
      where om.organization_id = budgets.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organization_members om
      where om.organization_id = budgets.organization_id
        and om.user_id = auth.uid()
    )
  );
