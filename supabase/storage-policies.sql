-- Run this once after creating the private "application-documents" bucket.
-- It lets each signed-in user manage only files under their own user-id folder.

drop policy if exists "documents_storage_select_own" on storage.objects;
drop policy if exists "documents_storage_insert_own" on storage.objects;
drop policy if exists "documents_storage_update_own" on storage.objects;
drop policy if exists "documents_storage_delete_own" on storage.objects;

create policy "documents_storage_select_own"
on storage.objects for select using (
  bucket_id = 'application-documents' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "documents_storage_insert_own"
on storage.objects for insert with check (
  bucket_id = 'application-documents' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "documents_storage_update_own"
on storage.objects for update using (
  bucket_id = 'application-documents' and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'application-documents' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "documents_storage_delete_own"
on storage.objects for delete using (
  bucket_id = 'application-documents' and auth.uid()::text = (storage.foldername(name))[1]
);
