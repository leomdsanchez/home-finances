-- Campos de cache de saldo na organização
alter table organizations
  add column if not exists balance_value numeric,
  add column if not exists balance_currency text,
  add column if not exists balance_updated_at timestamptz,
  add column if not exists balance_missing_rate boolean not null default false;

-- Função de recomputar saldo em moeda base da organização.
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

-- Trigger helper para CRUD de transações.
create or replace function trg_recompute_org_balance_tx()
  returns trigger
  language plpgsql
as $$
declare
  v_org uuid;
begin
  v_org := coalesce(new.organization_id, old.organization_id);
  if v_org is null then
    return null;
  end if;
  perform recompute_org_balance(v_org);
  return null;
end;
$$;

drop trigger if exists recompute_org_balance_tx_ins on transactions;
drop trigger if exists recompute_org_balance_tx_upd on transactions;
drop trigger if exists recompute_org_balance_tx_del on transactions;

create trigger recompute_org_balance_tx_ins
  after insert on transactions
  for each row execute procedure trg_recompute_org_balance_tx();

create trigger recompute_org_balance_tx_upd
  after update on transactions
  for each row execute procedure trg_recompute_org_balance_tx();

create trigger recompute_org_balance_tx_del
  after delete on transactions
  for each row execute procedure trg_recompute_org_balance_tx();

-- Trigger para mudança de moeda base da organização.
create or replace function trg_recompute_org_balance_org()
  returns trigger
  language plpgsql
as $$
begin
  if new.base_currency is distinct from old.base_currency then
    perform recompute_org_balance(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists recompute_org_balance_org_upd on organizations;

create trigger recompute_org_balance_org_upd
  after update on organizations
  for each row execute procedure trg_recompute_org_balance_org();
