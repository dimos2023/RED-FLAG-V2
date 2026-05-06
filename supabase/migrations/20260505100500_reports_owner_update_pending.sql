-- Allow submitters to update their own report while it is still pending (e.g. attach logo path after upload).

drop policy if exists "reports_update_own_pending" on public.reports;

create policy "reports_update_own_pending"
  on public.reports for update to authenticated
  using (auth.uid() = owner_id and review_status = 'pending')
  with check (auth.uid() = owner_id and review_status = 'pending');
