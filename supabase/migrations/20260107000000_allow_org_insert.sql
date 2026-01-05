-- Allow authenticated users to criar organizações sem membership prévio.
-- Mantemos as políticas de update/delete existentes (que exigem membership).

drop policy if exists organizations_insert_authenticated on organizations;

create policy organizations_insert_authenticated on organizations
  for insert
  to authenticated
  with check (true);
