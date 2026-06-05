-- Add avatar support to user profiles and record search history.

alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

alter table public.search_logs enable row level security;

create policy if not exists "search_logs_select_self"
  on public.search_logs for select to authenticated
  using (auth.uid() = user_id);

create policy if not exists "search_logs_insert_self"
  on public.search_logs for insert to authenticated
  with check (auth.uid() = user_id);
