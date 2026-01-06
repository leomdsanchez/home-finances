-- Backfill inicial do saldo cacheado para organizações existentes.
do $$
declare
  r record;
begin
  for r in select id from organizations loop
    perform recompute_org_balance(r.id);
  end loop;
end $$;
