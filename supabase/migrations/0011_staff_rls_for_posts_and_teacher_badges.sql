-- ============================================================================
-- 0011_staff_rls_for_posts_and_teacher_badges.sql
-- PURPOSE: Let editors and school admins act as staff on posts and teacher
--          badge updates, and let super admins insert tenant-scoped posts
--          (e.g. recognition announcements) without a membership row.
--
--   * posts_insert_verified_member (INSERT with_check):
--       author_user_id = auth.uid()
--       AND status IN ('draft','in_review')
--       AND (tenant_id IS NULL OR is_super_admin(auth.uid())
--            OR is_verified_member(auth.uid(), tenant_id,
--                ARRAY['student','teacher','editor','school_admin']))
--   * teacher_profiles_update_self_or_staff (UPDATE qual):
--       user_id = auth.uid() OR is_super_admin(auth.uid())
--       OR can_moderate_tenant(auth.uid(), tenant_id,
--           ARRAY['editor','school_admin'])
-- ============================================================================

drop policy if exists posts_insert_verified_member on public.posts;
create policy posts_insert_verified_member on public.posts
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and status in ('draft'::post_status, 'in_review'::post_status)
    and (
      tenant_id is null
      or is_super_admin(auth.uid())
      or is_verified_member(auth.uid(), tenant_id, array[
        'student'::membership_role,
        'teacher'::membership_role,
        'editor'::membership_role,
        'school_admin'::membership_role
      ])
    )
  );

drop policy if exists teacher_profiles_update_self_or_staff on public.teacher_profiles;
create policy teacher_profiles_update_self_or_staff on public.teacher_profiles
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or is_super_admin(auth.uid())
    or can_moderate_tenant(auth.uid(), tenant_id, array[
      'editor'::membership_role,
      'school_admin'::membership_role
    ])
  );
