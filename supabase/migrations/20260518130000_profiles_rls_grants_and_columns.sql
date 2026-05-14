-- Harden profiles + app_admins for authenticated clients (403 mitigation).
-- Runs after phone / verification_status / national_id_number migrations when present.
-- Idempotent.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists verification_status text;
alter table public.profiles add column if not exists national_id_number text;

update public.profiles
set verification_status = 'pending'
where verification_status is null;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "app_admins_select_self" on public.app_admins;
create policy "app_admins_select_self"
  on public.app_admins
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.app_admins to authenticated;
