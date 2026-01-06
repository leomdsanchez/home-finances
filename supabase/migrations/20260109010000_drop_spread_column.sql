-- Remove a coluna de spread; as taxas passam a ser apenas o valor bruto.
alter table if exists org_exchange_defaults
  drop column if exists spread_pct;
