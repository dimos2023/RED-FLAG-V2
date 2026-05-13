-- 1) Store uploaded object paths as text[] in national_id_storage_path (same column name, array type).
-- 2) Ensure a profiles row exists when auth.users is created (works with email confirmation before client session).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'national_id_storage_path'
      and data_type = 'text'
  ) then
    alter table public.profiles
      alter column national_id_storage_path type text[]
      using (
        case
          when national_id_storage_path is null then null::text[]
          when trim(national_id_storage_path::text) = '' then null::text[]
          when position('|' in national_id_storage_path::text) > 0 then
            string_to_array(trim(both from national_id_storage_path::text), '|')::text[]
          else array[trim(both from national_id_storage_path::text)]::text[]
        end
      );
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'national_id_storage_path'
  ) then
    alter table public.profiles add column national_id_storage_path text[];
  end if;
end $$;

-- Minimal profile row on signup (security definer bypasses RLS; matches auth.users.id).
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_verified)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profiles on auth.users;

create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_profile();
