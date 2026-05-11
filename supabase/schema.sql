-- Red-Flag starter schema — adjust to your jurisdiction and lawyer review.
-- Private evidence bucket + storage policies: run migrations/20260504120000_fraud_evidence_bucket.sql

create extension if not exists "pgcrypto";

-- Link to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_type text not null check (account_type in ('individual', 'company')),
  terms_version text not null,
  phone text,
  commercial_registry text,
  company_email text,
  is_verified boolean not null default false,
  full_legal_name text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  shipping_country text,
  company_legal_name text,
  company_address_line1 text,
  company_address_line2 text,
  company_city text,
  company_region text,
  company_postal_code text,
  company_country text,
  company_location_note text,
  national_id_storage_path text,
  commercial_registry_storage_paths text[],
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create policy "app_admins_select_self"
  on public.app_admins for select to authenticated
  using (user_id = auth.uid());

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  subject_name text not null,
  subject_phone text,
  subject_cr text,
  subject_address text,
  review_status text not null default 'pending'
    constraint reports_review_status_check
    check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  admin_note text,
  logo_storage_path text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_insert_own"
  on public.reports for insert to authenticated
  with check (auth.uid() = owner_id and review_status = 'pending');

create policy "reports_select_own_or_admin"
  on public.reports for select to authenticated
  using (
    auth.uid() = owner_id
    or exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );

create policy "reports_update_own_pending"
  on public.reports for update to authenticated
  using (auth.uid() = owner_id and review_status = 'pending')
  with check (auth.uid() = owner_id and review_status = 'pending');

create policy "reports_update_admin"
  on public.reports for update to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));

create table if not exists public.evidence_objects (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

alter table public.evidence_objects enable row level security;

create policy "evidence_owner_all"
  on public.evidence_objects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "evidence_select_admin"
  on public.evidence_objects for select to authenticated
  using (
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
  );

-- Storage: create bucket `evidence` as non-public; use signed URLs only.
