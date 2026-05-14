-- Account lifecycle: verification_status pending | verified | rejected
-- Optional phone on profile for middleware completeness checks.

alter table public.profiles add column if not exists phone text;

alter table public.profiles add column if not exists verification_status text;

update public.profiles
set verification_status = 'pending'
where verification_status is null;

alter table public.profiles
  alter column verification_status set default 'pending';

alter table public.profiles
  alter column verification_status set not null;

alter table public.profiles drop constraint if exists profiles_verification_status_check;

alter table public.profiles
  add constraint profiles_verification_status_check
  check (verification_status in ('pending', 'verified', 'rejected'));

update public.profiles
set verification_status = 'verified'
where is_verified is true;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_verified, verification_status)
  values (new.id, new.email, false, 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;
