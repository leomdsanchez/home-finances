-- Add spread_pct to org_exchange_defaults if missing
alter table org_exchange_defaults
  add column if not exists spread_pct numeric not null default 0;
