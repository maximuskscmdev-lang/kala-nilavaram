-- Kala Nilavaram — 0001: extensions + enums
-- Multi-tenant (per-school) schema. Every tenant-scoped table carries a
-- tenant_id FK to `tenants`, enforced via RLS in 0004_rls_policies.sql.

create extension if not exists "pgcrypto";   -- gen_random_uuid(), digest()
create extension if not exists "citext";     -- case-insensitive text (emails, pen names)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type membership_role as enum (
  'student',
  'teacher',
  'editor',        -- school-level editorial team (student/platform staff only)
  'moderator',      -- whistleblower inbox (student/platform staff only)
  'school_admin'    -- platform-side tenant manager
);

create type verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

create type display_mode as enum ('real', 'pen_name', 'anonymous');

create type post_type as enum ('news_campus', 'news_aggregated', 'event', 'announcement');

create type post_status as enum ('draft', 'in_review', 'published', 'rejected', 'archived');

create type study_item_type as enum ('note', 'pdf', 'image', 'link');

create type board_type as enum ('state_board', 'cbse', 'icse', 'other');

create type whistleblower_category as enum (
  'harassment', 'safety', 'financial_administrative', 'facilities', 'discrimination', 'other'
);

create type whistleblower_status as enum (
  'received', 'under_review', 'verified_contacted', 'action_taken', 'escalated', 'closed'
);

create type review_target_type as enum ('school', 'teacher');

create type reviewer_role as enum ('student', 'teacher');

create type review_status as enum ('pending', 'published', 'flagged', 'removed');

create type recognition_round_status as enum ('open', 'scoring', 'awarded', 'closed');
