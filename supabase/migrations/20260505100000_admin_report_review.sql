-- Admin list + approve/reject fraud reports.
-- After migration: add your user id as admin (SQL Editor):
--   insert into public.app_admins (user_id) values ('YOUR-USER-UUID-HERE')
--   on conflict (user_id) do nothing;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "app_admins_select_self" on public.app_admins;
create policy "app_admins_select_self"
  on public.app_admins for select to authenticated
  using (user_id = auth.uid());

alter table public.reports
  add column if not exists review_status text not null default 'pending'
    constraint reports_review_status_check
    check (review_status in ('pending', 'approved', 'rejected'));

alter table public.reports
  add column if not exists reviewed_by uuid references auth.users (id);

alter table public.reports
  add column if not exists reviewed_at timestamptz;

alter table public.reports
  add column if not exists admin_note text;

alter table public.reports
  add column if not exists logo_storage_path text;

drop policy if exists "reports_owner_all" on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_select_own_or_admin" on public.reports;
drop policy if exists "reports_update_admin" on public.reports;

create policy "reports_insert_own"
  on public.reports for insert to authenticated
  with check (
    auth.uid() = owner_id
    and review_status = 'pending'
  );

create policy "reports_select_own_or_admin"
  on public.reports for select to authenticated
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.app_admins a where a.user_id = auth.uid()
    )
  );

create policy "reports_update_admin"
  on public.reports for update to authenticated
  using (
    exists (
      select 1 from public.app_admins a where a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.app_admins a where a.user_id = auth.uid()
    )
  );

drop policy if exists "evidence_select_admin" on public.evidence_objects;
create policy "evidence_select_admin"
  on public.evidence_objects for select to authenticated
  using (
    exists (
      select 1 from public.app_admins a where a.user_id = auth.uid()
    )
  );
