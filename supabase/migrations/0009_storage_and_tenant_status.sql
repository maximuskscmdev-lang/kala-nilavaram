-- Kala Nilavaram — 0009: tenant review lifecycle + study-file storage bucket
-- 1. Extends the tenants lifecycle with 'rejected' so the platform admin
--    chapter-review queue (/admin/chapters) can decline a request.
-- 2. Provisions the public 'study-files' bucket used by the Study Hub upload
--    flow (apps/web/app/school/[slug]/study/actions.ts).

-- ---------------------------------------------------------------------------
-- tenants: allow a super admin to reject a chapter request
-- ---------------------------------------------------------------------------
alter table tenants
  drop constraint tenants_status_check,
  add constraint tenants_status_check check (status in ('pending', 'active', 'suspended', 'rejected'));

-- ---------------------------------------------------------------------------
-- storage: 'study-files' bucket (public read, authenticated write, owner mgmt)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-files',
  'study-files',
  true,
  10485760, -- 10 MB, matches next.config.js serverActions.bodySizeLimit
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "study_files_public_read" on storage.objects
  for select using (bucket_id = 'study-files');

create policy "study_files_auth_insert" on storage.objects
  for insert with check (bucket_id = 'study-files' and auth.role() = 'authenticated');

create policy "study_files_owner_update" on storage.objects
  for update using (bucket_id = 'study-files' and owner = auth.uid());

create policy "study_files_owner_delete" on storage.objects
  for delete using (bucket_id = 'study-files' and owner = auth.uid());