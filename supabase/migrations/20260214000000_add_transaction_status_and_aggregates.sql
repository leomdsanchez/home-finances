-- 1) Transaction status: previsto vs realizado
alter table transactions
  add column if not exists status text;

update transactions
   set status = 'realizado'
 where status is null;

alter table transactions
  alter column status set default 'realizado',
  alter column status set not null;

do $$
begin
  alter table transactions
    add constraint transactions_status_check
    check (status in ('previsto', 'realizado'));
exception
  when duplicate_object then null;
end $$;

-- Indexes for common filters (month consumption, balances).
create index if not exists transactions_org_status_account_idx
  on transactions (organization_id, status, account_id);

create index if not exists transactions_org_status_type_date_idx
  on transactions (organization_id, status, type, date);

-- 2) Org balance cache: ignore "previsto" (planned) transactions.
create or replace function recompute_org_balance(p_org_id uuid)
  returns table (
    balance numeric,
    base_currency text,
    missing_rate boolean,
    updated_at timestamptz
  )
  language plpgsql
  security definer
as $$
declare
  v_base text;
  v_sum numeric := 0;
  v_missing boolean := false;
  r record;
  v_rate numeric;
begin
  select base_currency into v_base from organizations where id = p_org_id;
  if v_base is null then
    raise exception 'Organization % not found', p_org_id;
  end if;
  v_base := upper(v_base);

  for r in
    select currency, type, sum(amount) as total
    from transactions
    where organization_id = p_org_id
      and status = 'realizado'
    group by currency, type
  loop
    if upper(r.currency) = v_base then
      v_rate := 1;
    else
      select rate into v_rate
        from org_exchange_defaults
       where organization_id = p_org_id
         and upper(from_currency) = v_base
         and upper(to_currency) = upper(r.currency);

      if v_rate is null then
        select (1 / rate) into v_rate
          from org_exchange_defaults
         where organization_id = p_org_id
           and upper(from_currency) = upper(r.currency)
           and upper(to_currency) = v_base;
      end if;
    end if;

    if v_rate is null then
      v_missing := true;
      continue;
    end if;

    if r.type = 'income' then
      v_sum := v_sum + (r.total * v_rate);
    else
      v_sum := v_sum - (r.total * v_rate);
    end if;
  end loop;

  update organizations
     set balance_value = v_sum,
         balance_currency = v_base,
         balance_updated_at = now(),
         balance_missing_rate = v_missing
   where id = p_org_id;

  return query
  select v_sum, v_base, v_missing, now();
end;
$$;

-- 3) Aggregates for dashboards/budgets (run under RLS, no security definer).
create or replace function list_account_balances(p_org_id uuid)
  returns table (
    account_id uuid,
    balance numeric
  )
  language sql
  stable
as $$
  select
    t.account_id,
    sum(case when t.type = 'income' then t.amount else -t.amount end) as balance
  from transactions t
  where t.organization_id = p_org_id
    and t.status = 'realizado'
  group by t.account_id;
$$;

create or replace function list_month_expense_totals(p_org_id uuid, p_month date)
  returns table (
    category_id uuid,
    currency text,
    total numeric
  )
  language sql
  stable
as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as month_start,
      (date_trunc('month', p_month) + interval '1 month')::date as month_end
  )
  select
    t.category_id,
    upper(t.currency) as currency,
    sum(t.amount) as total
  from transactions t
  cross join bounds b
  where t.organization_id = p_org_id
    and t.type = 'expense'
    and t.status = 'realizado'
    and t.transfer_id is null
    and t.date >= b.month_start
    and t.date < b.month_end
  group by t.category_id, upper(t.currency);
$$;

grant execute on function list_account_balances(uuid) to authenticated;
grant execute on function list_month_expense_totals(uuid, date) to authenticated;
