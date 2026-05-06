-- Private bucket for fraud evidence (PDF / images). Run in Supabase SQL Editor or via CLI.
-- Dashboard: Authentication → Providers → enable Email.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'fraud-evidence',
    'fraud-evidence',
    false,
    52428800,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fraud_evidence_select_own" on storage.objects;
drop policy if exists "fraud_evidence_insert_own" on storage.objects;
drop policy if exists "fraud_evidence_update_own" on storage.objects;
drop policy if exists "fraud_evidence_delete_own" on storage.objects;

create policy "fraud_evidence_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fraud-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fraud_evidence_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fraud-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fraud_evidence_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'fraud-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fraud_evidence_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'fraud-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
