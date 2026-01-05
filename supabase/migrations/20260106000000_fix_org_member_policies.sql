-- Fix recursive policies on organization_members and simplify membership checks.

-- Drop old policies that referenced organization_members recursively.
drop policy if exists organization_members_select on organization_members;
drop policy if exists organization_members_write on organization_members;

-- Allow a user to see and manage only their own membership rows.
create policy organization_members_self_select on organization_members
  for select using (auth.uid() = user_id);

create policy organization_members_self_manage on organization_members
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No change needed for other tables; they still rely on organization_members to gate access.
