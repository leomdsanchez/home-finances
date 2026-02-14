-- Fix: PL/pgSQL variable shadowing for return column "base_currency".
-- Without qualifying, `select base_currency ...` is ambiguous between the column and the implicit return var.
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
  select o.base_currency into v_base from organizations o where o.id = p_org_id;
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

