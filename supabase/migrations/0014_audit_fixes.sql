-- ============================================================================
-- 0014_audit_fixes.sql
-- PURPOSE: Consolidated fixes from the security/functionality audit.
--   * Drop the dead 7-arg PGP whistleblower submit overload (0008).
--   * Persist nomination subject_taught / years_at_school (bug #11).
--   * Atomic 1-review-per-period guard (bug #15).
--   * Unique index on post_reactions (bug #18).
--   * Higher-entropy tracking IDs (bugs #5 / #20).
--   * Restrict whistleblower IDENTITY access to moderator + super_admin only
--     (bugs #3 / #4) — school administration can still triage metadata, but
--     can never read submitter contact / invoke the audited reveal.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the dead 7-arg PGP submit_whistleblower_report overload (0008).
--    The live flow uses the 5-arg bytea version defined in 0010.
-- ---------------------------------------------------------------------------
drop function if exists public.submit_whistleblower_report(
  uuid, public.whistleblower_category, text, text[], text, text, text
);

-- ---------------------------------------------------------------------------
-- 2. Persist nomination subject_taught / years_at_school (bug #11).
-- ---------------------------------------------------------------------------
alter table public.teacher_nominations
  add column if not exists subject_taught text;

alter table public.teacher_nominations
  add column if not exists years_at_school smallint;

-- ---------------------------------------------------------------------------
-- 3. Atomic 1-review-per-period guard (bug #15).
--    Replaces the racy read-then-insert app check with a DB-level unique
--    insert. Window = calendar month (close enough to "30 days" and fully
--    atomic under concurrent requests).
-- ---------------------------------------------------------------------------
create table if not exists public.review_rate_locks (
  user_id      uuid not null,
  tenant_id    uuid not null,
  window_month date not null,
  primary key (user_id, tenant_id, window_month)
);

create or replace function public.acquire_review_lock(p_user uuid, p_tenant uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  insert into public.review_rate_locks (user_id, tenant_id, window_month)
  values (p_user, p_tenant, date_trunc('month', now())::date)
  on conflict do nothing;
  return found; -- true if we inserted the lock, false if one already existed
end;
$$;

revoke all on function public.acquire_review_lock(uuid, uuid) from public;
grant execute on function public.acquire_review_lock(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Unique index on post_reactions (bug #18) — kills the toggle race.
-- ---------------------------------------------------------------------------
create unique index if not exists post_reactions_unique_idx
  on public.post_reactions (post_id, user_id, reaction_type);

-- ---------------------------------------------------------------------------
-- 5. Higher-entropy tracking IDs (bugs #5 / #20).
-- ---------------------------------------------------------------------------
create or replace function public.generate_tracking_id()
returns text
language sql
volatile
as $$
  select 'KN-' || to_char(now(), 'YYYY') || '-' ||
         upper(substr(encode(extensions.gen_random_bytes(9), 'hex'), 1, 12));
$$;

-- ---------------------------------------------------------------------------
-- 6. Restrict whistleblower IDENTITY access to moderator + super_admin (bugs #3/#4).
--    school_admin may still triage report metadata (status / safety flag) but
--    can no longer SELECT contact_encrypted nor call reveal_whistleblower_identity.
-- ---------------------------------------------------------------------------
drop policy if exists wb_select_staff on public.whistleblower_reports;
create policy wb_select_staff on public.whistleblower_reports
  for select using (
    is_super_admin(auth.uid()) or
    can_moderate_tenant(auth.uid(), tenant_id, array['moderator']::membership_role[])
  );

drop policy if exists wb_identity_log_select_staff on public.whistleblower_identity_access_log;
create policy wb_identity_log_select_staff on public.whistleblower_identity_access_log
  for select using (
    exists (
      select 1 from public.whistleblower_reports r
      where r.id = report_id and (
        is_super_admin(auth.uid()) or
        can_moderate_tenant(auth.uid(), r.tenant_id, array['moderator']::membership_role[])
      )
    )
  );

-- Recreate reveal_whistleblower_identity without school_admin in the access set.
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
  from public.whistleblower_reports where id = p_report_id;

  if v_tenant is null then
    raise exception 'report not found';
  end if;

  if not can_moderate_tenant(v_uid, v_tenant, array['moderator']::membership_role[]) then
    raise exception 'not authorized to view submitter identity';
  end if;

  insert into public.whistleblower_identity_access_log (report_id, moderator_id, reason)
  values (p_report_id, v_uid, coalesce(p_reason, 'not specified'));

  return query select v_contact::text;
end;
$function$;

-- grant stays available to authenticated; the function itself enforces the role set.
grant execute on function public.reveal_whistleblower_identity(uuid, text) to authenticated;
