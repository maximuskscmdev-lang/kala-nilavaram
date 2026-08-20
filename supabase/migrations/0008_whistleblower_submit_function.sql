-- Kala Nilavaram — 0008: audited whistleblower submission function
-- Encrypts contact details server-side with pgp_sym_encrypt using the
-- app.whistleblower_key session setting (populated from
-- WHISTLEBLOWER_ENCRYPTION_KEY by the server action — see
-- apps/web/app/school/[slug]/whistleblower/actions.ts). The anon/authenticated
-- Postgres role never has direct INSERT on whistleblower_reports for the
-- encrypted column, so all submissions must go through this function.

create or replace function generate_tracking_id()
returns text language sql volatile as $$
  select 'KN-' || to_char(now(), 'YYYY') || '-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
$$;

create or replace function submit_whistleblower_report(
  p_tenant_id uuid,
  p_category whistleblower_category,
  p_description text,
  p_evidence_urls text[],
  p_real_name text,
  p_phone text,
  p_email text
) returns text  -- returns the tracking_id
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_tracking_id text;
  v_contact jsonb;
begin
  if v_uid is null then
    raise exception 'must be signed in to submit';
  end if;

  if not is_verified_member(v_uid, p_tenant_id, array['student','teacher']::membership_role[]) then
    raise exception 'must be a verified student or teacher of this school';
  end if;

  v_contact := jsonb_build_object('real_name', p_real_name, 'phone', p_phone, 'email', p_email);
  v_tracking_id := generate_tracking_id();

  insert into whistleblower_reports (
    tenant_id, tracking_id, category, description, evidence_urls,
    submitter_user_id, contact_encrypted, status
  ) values (
    p_tenant_id, v_tracking_id, p_category, p_description, coalesce(p_evidence_urls, '{}'),
    v_uid, pgp_sym_encrypt(v_contact::text, current_setting('app.whistleblower_key', true)),
    'received'
  );

  insert into whistleblower_status_log (report_id, status, note_public, moderator_id)
  select id, 'received', 'Report received. A moderator will triage this shortly.', null
  from whistleblower_reports where tracking_id = v_tracking_id;

  return v_tracking_id;
end;
$$;

revoke all on function submit_whistleblower_report(uuid, whistleblower_category, text, text[], text, text, text) from public;
grant execute on function submit_whistleblower_report(uuid, whistleblower_category, text, text[], text, text, text) to authenticated;
