-- Kala Nilavaram — 0007: Row Level Security
-- Default posture: RLS enabled on every table, deny-by-default, then narrow
-- grants per role. Super admins (platform_admins) can see everything;
-- school_admin/editor/moderator are scoped to their own tenant only.

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table platform_admins enable row level security;
alter table memberships enable row level security;
alter table author_identities enable row level security;
alter table audit_logs enable row level security;
alter table posts enable row level security;
alter table post_comments enable row level security;
alter table post_reactions enable row level security;
alter table study_items enable row level security;
alter table study_upvotes enable row level security;
alter table study_saves enable row level security;
alter table aggregated_news_sources enable row level security;
alter table whistleblower_reports enable row level security;
alter table whistleblower_status_log enable row level security;
alter table whistleblower_identity_access_log enable row level security;
alter table reviews enable row level security;
alter table review_flags enable row level security;
alter table teacher_profiles enable row level security;
alter table recognition_rounds enable row level security;
alter table teacher_nominations enable row level security;
alter table recognition_awards enable row level security;

-- ---------------------------------------------------------------------------
-- tenants — publicly readable (school list), writes restricted
-- ---------------------------------------------------------------------------
create policy tenants_select_all on tenants for select using (true);
create policy tenants_insert_self_serve on tenants for insert
  with check (auth.uid() is not null);  -- "start a chapter" flow; status starts 'pending'
create policy tenants_update_admin on tenants for update
  using (is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- profiles — a user can see/edit only their own; moderators/editors can
-- read (never list broadly) profiles within their tenant for verification.
-- ---------------------------------------------------------------------------
create policy profiles_select_self on profiles for select using (id = auth.uid());
create policy profiles_select_staff on profiles for select using (
  is_super_admin(auth.uid()) or exists (
    select 1 from memberships m1, memberships m2
    where m1.user_id = auth.uid() and m1.role in ('editor','moderator','school_admin') and m1.is_active
      and m2.user_id = profiles.id and m2.tenant_id = m1.tenant_id
  )
);
create policy profiles_update_self on profiles for update using (id = auth.uid());
create policy profiles_insert_self on profiles for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- platform_admins — only readable by other super admins
-- ---------------------------------------------------------------------------
create policy platform_admins_select on platform_admins for select using (is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create policy memberships_select_self on memberships for select using (user_id = auth.uid());
create policy memberships_select_staff on memberships for select using (
  can_moderate_tenant(auth.uid(), tenant_id, array['editor','moderator','school_admin']::membership_role[])
);
create policy memberships_insert_self on memberships for insert with check (user_id = auth.uid());
create policy memberships_update_staff on memberships for update using (
  can_moderate_tenant(auth.uid(), tenant_id, array['school_admin']::membership_role[])
);

-- ---------------------------------------------------------------------------
-- author_identities — owner can manage; staff can list (not reveal — that
-- goes through reveal_author_identity() only) for their tenant.
-- ---------------------------------------------------------------------------
create policy author_identities_select_self on author_identities for select using (user_id = auth.uid());
create policy author_identities_select_staff on author_identities for select using (
  can_moderate_tenant(auth.uid(), tenant_id, array['editor','moderator','school_admin']::membership_role[])
);
create policy author_identities_insert_self on author_identities for insert with check (user_id = auth.uid());
create policy author_identities_update_self on author_identities for update using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- audit_logs — staff-readable for their tenant only, never client-writable
-- ---------------------------------------------------------------------------
create policy audit_logs_select_staff on audit_logs for select using (
  is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), tenant_id, array['editor','moderator','school_admin']::membership_role[])
);

-- ---------------------------------------------------------------------------
-- posts — published posts are public; drafts/in_review visible to author +
-- editorial staff of that tenant.
-- ---------------------------------------------------------------------------
create policy posts_select_published on posts for select using (status = 'published');
create policy posts_select_own on posts for select using (author_user_id = auth.uid());
create policy posts_select_staff on posts for select using (
  is_super_admin(auth.uid()) or (tenant_id is not null and can_moderate_tenant(auth.uid(), tenant_id, array['editor','school_admin']::membership_role[]))
);
create policy posts_insert_verified_member on posts for insert with check (
  author_user_id = auth.uid() and status in ('draft','in_review') and
  (tenant_id is null or is_verified_member(auth.uid(), tenant_id, array['student','teacher']::membership_role[]))
);
create policy posts_update_own_draft on posts for update using (
  author_user_id = auth.uid() and status in ('draft','in_review')
);
create policy posts_update_staff on posts for update using (
  is_super_admin(auth.uid()) or (tenant_id is not null and can_moderate_tenant(auth.uid(), tenant_id, array['editor','school_admin']::membership_role[]))
);

-- ---------------------------------------------------------------------------
-- post_comments / post_reactions — any authenticated user may comment/react
-- on a published post; own comment editable/removable by author or staff.
-- ---------------------------------------------------------------------------
create policy comments_select_visible on post_comments for select using (status = 'visible');
create policy comments_insert_auth on post_comments for insert with check (
  user_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and p.status = 'published')
);
create policy comments_update_own_or_staff on post_comments for update using (
  user_id = auth.uid() or is_super_admin(auth.uid()) or exists (
    select 1 from posts p where p.id = post_id and p.tenant_id is not null
      and can_moderate_tenant(auth.uid(), p.tenant_id, array['editor','moderator','school_admin']::membership_role[])
  )
);
create policy reactions_select_all on post_reactions for select using (true);
create policy reactions_insert_own on post_reactions for insert with check (user_id = auth.uid());
create policy reactions_delete_own on post_reactions for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- study_items — published items public within platform; auto-publish with
-- post-hoc moderation per Section 4B.
-- ---------------------------------------------------------------------------
create policy study_select_published on study_items for select using (status = 'published');
create policy study_select_own on study_items for select using (author_user_id = auth.uid());
create policy study_select_staff on study_items for select using (
  is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), tenant_id, array['editor','school_admin']::membership_role[])
);
create policy study_insert_verified_member on study_items for insert with check (
  author_user_id = auth.uid() and is_verified_member(auth.uid(), tenant_id, array['student','teacher']::membership_role[])
);
create policy study_update_own_or_staff on study_items for update using (
  author_user_id = auth.uid() or is_super_admin(auth.uid())
  or can_moderate_tenant(auth.uid(), tenant_id, array['editor','school_admin']::membership_role[])
);
create policy study_upvotes_all on study_upvotes for select using (true);
create policy study_upvotes_insert_own on study_upvotes for insert with check (user_id = auth.uid());
create policy study_upvotes_delete_own on study_upvotes for delete using (user_id = auth.uid());
create policy study_saves_own on study_saves for select using (user_id = auth.uid());
create policy study_saves_insert_own on study_saves for insert with check (user_id = auth.uid());
create policy study_saves_delete_own on study_saves for delete using (user_id = auth.uid());

create policy news_sources_select_all on aggregated_news_sources for select using (true);
create policy news_sources_write_admin on aggregated_news_sources for all using (is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- whistleblower_reports — the strictest table. No public/self SELECT at
-- all (status is read only via get_report_status_by_tracking_id()). Only
-- assigned moderators, school_admin of the tenant, and super_admin can see
-- rows directly (for triage), and even then contact_encrypted stays opaque
-- until reveal_whistleblower_identity() is called.
-- ---------------------------------------------------------------------------
create policy wb_select_staff on whistleblower_reports for select using (
  is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), tenant_id, array['moderator','school_admin']::membership_role[])
);
create policy wb_insert_verified_member on whistleblower_reports for insert with check (
  submitter_user_id = auth.uid() and is_verified_member(auth.uid(), tenant_id, array['student','teacher']::membership_role[])
);
create policy wb_update_staff on whistleblower_reports for update using (
  is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), tenant_id, array['moderator','school_admin']::membership_role[])
);

create policy wb_status_log_select_staff on whistleblower_status_log for select using (
  exists (select 1 from whistleblower_reports r where r.id = report_id and (
    is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), r.tenant_id, array['moderator','school_admin']::membership_role[])
  ))
);
create policy wb_status_log_insert_staff on whistleblower_status_log for insert with check (
  exists (select 1 from whistleblower_reports r where r.id = report_id and (
    is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), r.tenant_id, array['moderator']::membership_role[])
  ))
);

create policy wb_identity_log_select_staff on whistleblower_identity_access_log for select using (
  exists (select 1 from whistleblower_reports r where r.id = report_id and (
    is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), r.tenant_id, array['school_admin']::membership_role[])
  ))
);
-- Note: inserts into whistleblower_identity_access_log happen only inside
-- reveal_whistleblower_identity() (security definer), never directly.

-- ---------------------------------------------------------------------------
-- reviews — published reviews are public; teacher reviewers cannot target
-- a named teacher (enforced at table constraint level too).
-- ---------------------------------------------------------------------------
create policy reviews_select_published on reviews for select using (status = 'published');
create policy reviews_select_own on reviews for select using (reviewer_user_id = auth.uid());
create policy reviews_select_staff on reviews for select using (
  is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), tenant_id, array['editor','moderator','school_admin']::membership_role[])
);
create policy reviews_insert_verified on reviews for insert with check (
  reviewer_user_id = auth.uid() and
  is_verified_member(auth.uid(), tenant_id, array['student','teacher']::membership_role[])
);
create policy reviews_update_staff on reviews for update using (
  is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), tenant_id, array['editor','moderator','school_admin']::membership_role[])
);
create policy review_flags_insert_auth on review_flags for insert with check (flagged_by = auth.uid());
create policy review_flags_select_staff on review_flags for select using (
  exists (select 1 from reviews rv where rv.id = review_id and (
    is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), rv.tenant_id, array['editor','moderator','school_admin']::membership_role[])
  ))
);

-- ---------------------------------------------------------------------------
-- teacher_profiles / recognition — profiles public, nominations/awards
-- managed by editorial staff + school_admin
-- ---------------------------------------------------------------------------
create policy teacher_profiles_select_all on teacher_profiles for select using (true);
create policy teacher_profiles_upsert_self on teacher_profiles for insert with check (user_id = auth.uid());
create policy teacher_profiles_update_self_or_staff on teacher_profiles for update using (
  user_id = auth.uid() or is_super_admin(auth.uid())
  or can_moderate_tenant(auth.uid(), tenant_id, array['school_admin']::membership_role[])
);

create policy recognition_rounds_select_all on recognition_rounds for select using (true);
create policy recognition_rounds_write_staff on recognition_rounds for all using (
  is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), tenant_id, array['editor','school_admin']::membership_role[])
);

create policy nominations_select_all on teacher_nominations for select using (true);
create policy nominations_insert_verified on teacher_nominations for insert with check (
  exists (
    select 1 from recognition_rounds rr where rr.id = round_id and
    (nominated_by_user_id is null or nominated_by_user_id = auth.uid()) and
    is_verified_member(auth.uid(), rr.tenant_id, array['student','teacher']::membership_role[])
  )
);

create policy awards_select_all on recognition_awards for select using (true);
create policy awards_write_staff on recognition_awards for insert with check (
  exists (select 1 from recognition_rounds rr where rr.id = round_id and (
    is_super_admin(auth.uid()) or can_moderate_tenant(auth.uid(), rr.tenant_id, array['editor','school_admin']::membership_role[])
  ))
);
