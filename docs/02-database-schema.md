# Multi-Tenant Database Schema

Full SQL lives in `supabase/migrations/`, applied in order. This doc is the
map — read the migration files for exact columns/constraints.

## Migration order

1. `0001_extensions_and_enums.sql` — pgcrypto/citext extensions, all enum types
2. `0002_core_tables.sql` — `tenants`, `profiles`, `platform_admins`, `memberships`, `author_identities`, `audit_logs`
3. `0003_content_tables.sql` — `posts`, `post_comments`, `post_reactions`, `study_items`, `study_upvotes`, `study_saves`, `aggregated_news_sources`
4. `0004_whistleblower.sql` — `whistleblower_reports`, `whistleblower_status_log`, `whistleblower_identity_access_log`
5. `0005_reviews_recognition.sql` — `reviews`, `review_flags`, `teacher_profiles`, `recognition_rounds`, `teacher_nominations`, `recognition_awards`
6. `0006_helper_functions.sql` — RLS helper functions, identity-reveal functions, `updated_at` triggers
7. `0007_rls_policies.sql` — Row Level Security, enabled on every table
8. `0008_whistleblower_submit_function.sql` — audited submission RPC

## Key relationships

```
tenants (1) ──< memberships >── (1) auth.users ──(1:1)── profiles
tenants (1) ──< author_identities (pen name / anonymous, unique per tenant)
tenants (1) ──< posts (news/events/announcements, editorial workflow)
tenants (1) ──< study_items (auto-publish, post-hoc moderation)
tenants (1) ──< whistleblower_reports (strictest RLS on the platform)
tenants (1) ──< reviews (student|teacher, school|teacher target)
tenants (1) ──< teacher_profiles ──< recognition_rounds ──< teacher_nominations
                                                          └─< recognition_awards
platform_admins ── cross-tenant Super Admin access (not tenant-scoped)
```

## Multi-tenancy enforcement

Every tenant-scoped table carries a `tenant_id` foreign key. Isolation is
enforced by **Row Level Security**, not application-layer filtering — a
School Moderator's Postgres role can only ever `SELECT`/`UPDATE` rows where
`can_moderate_tenant(auth.uid(), tenant_id, ...)` returns true (defined in
`0006_helper_functions.sql`), while `platform_admins` rows bypass the tenant
check entirely via `is_super_admin()`. This means even a bug in a Next.js
page that forgets a `.eq('tenant_id', ...)` filter cannot leak
cross-tenant data — the database refuses the read.

## Sensitive-data design notes

- **`profiles.real_name`, `phone`, `email`**: never selectable by
  another regular user; only self, or editor/moderator/school_admin of a
  shared tenant (`profiles_select_staff` policy).
- **`whistleblower_reports.contact_encrypted`**: `bytea`, written via
  `pgp_sym_encrypt()` inside `submit_whistleblower_report()` — the
  anon/authenticated Postgres role has no direct `INSERT`/`UPDATE` grant on
  this column's plaintext form, and reading it back requires
  `reveal_whistleblower_identity()`, which is audit-logged in
  `whistleblower_identity_access_log` on every call.
- **`author_identities`**: pen names are `unique (tenant_id, pen_name)` —
  once claimed, reserved. Reveals go through `reveal_author_identity()`,
  logged in `audit_logs`.
- **`reviews.target_teacher_name`**: a check constraint
  (`teacher_reviews_no_named_target`) makes it structurally impossible for
  a `reviewer_role = 'teacher'` row to set this column — the Section 4D
  rule ("teachers never review named colleagues") is enforced by Postgres,
  not just UI validation.

## Applying migrations

See `docs/04-setup-to-launch.md` for exact CLI commands
(`supabase db push` / `supabase migration up`).

## Regenerating TypeScript types

`apps/web/lib/supabase/database.types.ts` ships as a placeholder stub.
Once your Supabase project exists and migrations are applied, run:

```bash
cd apps/web
npm run gen:types   # wraps: supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public
```
