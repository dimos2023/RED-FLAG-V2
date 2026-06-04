-- Align remote `public.reports` with app schema (PostgREST schema cache).
-- Fixes: Could not find the 'subject_address' column of 'reports' in the schema cache

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  subject_name text not null,
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists subject_phone text;
alter table public.reports add column if not exists subject_cr text;
alter table public.reports add column if not exists subject_address text;

-- Legacy installs sometimes used `address` instead of `subject_address`
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'address'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'subject_address'
  ) then
    alter table public.reports rename column address to subject_address;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'subject_notes'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'subject_address'
  ) then
    alter table public.reports rename column subject_notes to subject_address;
  end if;
end $$;

alter table public.reports add column if not exists review_status text not null default 'pending';
alter table public.reports add column if not exists reviewed_by uuid references auth.users (id);
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists admin_note text;
alter table public.reports add column if not exists logo_storage_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reports_review_status_check'
  ) then
    alter table public.reports
      add constraint reports_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));
  end if;
exception
  when others then
    null;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update on table public.reports to authenticated;
