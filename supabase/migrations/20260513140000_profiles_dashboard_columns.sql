-- Columns shown in Supabase Table Editor (profiles linked to auth.users by id).
-- Safe if your table was created from an older schema that omitted these.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists updated_at timestamptz;
