-- Permitir transações sem categoria (ex.: lançamentos avulsos ou transferências).
alter table transactions alter column category_id drop not null;

-- Ajustar a FK para não bloquear remoção de categorias; valores antigos são preservados.
alter table transactions drop constraint if exists transactions_category_id_fkey;
alter table transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id) references categories(id) on delete set null;
