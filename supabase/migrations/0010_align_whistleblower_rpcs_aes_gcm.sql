-- ============================================================================
-- 0010_align_whistleblower_rpcs_aes_gcm.sql
-- PURPOSE: Replace the PGP-encrypted RPC design with the Node AES-256-GCM
--          end-to-end flow. The app encrypts contact info in Node and stores
--          the ciphertext (bytea) as-is; the DB never holds the key.
--
--   * submit_whistleblower_report(...) -> text
--       - requires a signed-in, VERIFIED student/teacher of the tenant
--       - generates the human-readable tracking ID via generate_tracking_id()
--       - inserts the report (status 'received') + initial status-log row
--       - returns the tracking ID
--   * reveal_whistleblower_identity(...) -> table(contact_encrypted text)
--       - requires a moderator/school_admin of the report's tenant
--       - writes a row to whistleblower_identity_access_log (audit)
--       - returns the stored ciphertext (decryption happens in Node only)
-- ============================================================================

create or replace function public.submit_whistleblower_report(
  p_tenant_id uuid,
  p_category public.whistleblower_category,
  p_description text,
  p_evidence_urls text[],
  p_contact_encrypted bytea
) returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_tracking_id text;
begin
  if v_uid is null then
    raise exception 'must be signed in to submit';
  end if;

  if not is_verified_member(v_uid, p_tenant_id, array['student','teacher']::membership_role[]) then
    raise exception 'must be a verified student or teacher of this school';
  end if;

  v_tracking_id := generate_tracking_id();

  insert into whistleblower_reports (
    tenant_id, tracking_id, category, description, evidence_urls,
    submitter_user_id, contact_encrypted, status
  ) values (
    p_tenant_id, v_tracking_id, p_category, p_description, coalesce(p_evidence_urls, '{}'),
    v_uid, p_contact_encrypted, 'received'
  );

  insert into whistleblower_status_log (report_id, status, note_public, moderator_id)
  select id, 'received', 'Report received. A moderator will triage this shortly.', null
  from whistleblower_reports where tracking_id = v_tracking_id;

  return v_tracking_id;
end;
$function$;

create or replace function public.reveal_whistleblower_identity(
  p_report_id uuid,
  p_reason text
) returns table (contact_encrypted text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tenant uuid;
  v_contact bytea;
  v_uid uuid := auth.uid();
begin
  select tenant_id, contact_encrypted into v_tenant, v_contact
  from whistleblower_reports where id = p_report_id;

  if v_tenant is null then
    raise exception 'report not found';
  end if;

  if not can_moderate_tenant(v_uid, v_tenant, array['moderator','school_admin']::membership_role[]) then
    raise exception 'not authorized to view submitter identity';
  end if;

  insert into whistleblower_identity_access_log (report_id, moderator_id, reason)
  values (p_report_id, v_uid, coalesce(p_reason, 'not specified'));

  return query select v_contact::text;
end;
$function$;

grant execute on function public.submit_whistleblower_report(uuid, public.whistleblower_category, text, text[], bytea) to authenticated;
grant execute on function public.reveal_whistleblower_identity(uuid, text) to authenticated;
