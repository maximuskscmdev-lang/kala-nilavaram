-- Kala Nilavaram — 0006: security-definer helper functions used by RLS

create or replace function is_super_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = uid);
$$;

create or replace function has_tenant_role(uid uuid, t_id uuid, roles membership_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = uid and tenant_id = t_id and role = any(roles) and is_active
  );
$$;

create or replace function is_verified_member(uid uuid, t_id uuid, roles membership_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where user_id = uid and tenant_id = t_id and role = any(roles)
      and is_active and verification_status = 'verified'
  );
$$;

-- Used by post-editorial / whistleblower-moderation RLS: is this user an
-- editor/moderator/school_admin for this tenant, or a super admin?
create or replace function can_moderate_tenant(uid uuid, t_id uuid, roles membership_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select is_super_admin(uid) or has_tenant_role(uid, t_id, roles);
$$;

-- ---------------------------------------------------------------------------
-- Whistleblower: de-identified public status lookup by tracking ID + phone
-- last-4 (light auth so a tracking ID alone, if leaked, isn't enough).
-- SECURITY DEFINER so an anonymous/authenticated caller never touches the
-- underlying encrypted-contact row directly.
-- ---------------------------------------------------------------------------
create or replace function get_report_status_by_tracking_id(p_tracking_id text)
returns table (
  tracking_id text,
  category whistleblower_category,
  status whistleblower_status,
  latest_public_note text,
  created_at timestamptz,
  closed_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.tracking_id, r.category, r.status,
         (select l.note_public from whistleblower_status_log l
            where l.report_id = r.id and l.note_public is not null
            order by l.created_at desc limit 1) as latest_public_note,
         r.created_at, r.closed_at
  from whistleblower_reports r
  where r.tracking_id = p_tracking_id;
$$;

revoke all on function get_report_status_by_tracking_id(text) from public;
grant execute on function get_report_status_by_tracking_id(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Whistleblower: audited identity reveal. Only callable by an assigned
-- moderator / super admin. Every call is logged, per Section 5.
-- ---------------------------------------------------------------------------
create or replace function reveal_whistleblower_identity(p_report_id uuid, p_reason text)
returns table (real_name text, phone text, email citext)
language plpgsql security definer set search_path = public as $$
declare
  v_tenant uuid;
  v_contact bytea;
  v_decrypted text;
  v_uid uuid := auth.uid();
begin
  select tenant_id, contact_encrypted into v_tenant, v_contact
  from whistleblower_reports where id = p_report_id;

  if v_tenant is null then
    raise exception 'report not found';
  end if;

  if not can_moderate_tenant(v_uid, v_tenant, array['moderator']::membership_role[]) then
    raise exception 'not authorized to view submitter identity';
  end if;

  insert into whistleblower_identity_access_log (report_id, moderator_id, reason)
  values (p_report_id, v_uid, coalesce(p_reason, 'not specified'));

  -- Decrypted using the server-side symmetric key (set via
  -- `set_config('app.whistleblower_key', ..., true)` in the server action,
  -- from WHISTLEBLOWER_ENCRYPTION_KEY — never stored in the DB).
  v_decrypted := pgp_sym_decrypt(v_contact, current_setting('app.whistleblower_key', true));

  return query select
    (v_decrypted::jsonb ->> 'real_name'),
    (v_decrypted::jsonb ->> 'phone'),
    (v_decrypted::jsonb ->> 'email')::citext;
end;
$$;

revoke all on function reveal_whistleblower_identity(uuid, text) from public;
grant execute on function reveal_whistleblower_identity(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pen-name / anonymous identity reveal (Section 4E) — same pattern:
-- editor/moderator/super_admin only, always audit-logged.
-- ---------------------------------------------------------------------------
create or replace function reveal_author_identity(p_author_identity_id uuid, p_reason text)
returns table (real_name text) language plpgsql security definer set search_path = public as $$
declare
  v_tenant uuid;
  v_user uuid;
  v_uid uuid := auth.uid();
begin
  select tenant_id, user_id into v_tenant, v_user
  from author_identities where id = p_author_identity_id;

  if v_user is null then
    raise exception 'identity not found';
  end if;

  if not can_moderate_tenant(v_uid, v_tenant, array['editor', 'moderator', 'school_admin']::membership_role[]) then
    raise exception 'not authorized to reveal author identity';
  end if;

  insert into audit_logs (actor_user_id, action, target_table, target_id, tenant_id, metadata)
  values (v_uid, 'reveal_author_identity', 'author_identities', p_author_identity_id::text, v_tenant,
          jsonb_build_object('reason', coalesce(p_reason, 'not specified')));

  return query select p.real_name from profiles p where p.id = v_user;
end;
$$;

revoke all on function reveal_author_identity(uuid, text) from public;
grant execute on function reveal_author_identity(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_posts_updated_at before update on posts
  for each row execute function set_updated_at();
create trigger trg_study_items_updated_at before update on study_items
  for each row execute function set_updated_at();
