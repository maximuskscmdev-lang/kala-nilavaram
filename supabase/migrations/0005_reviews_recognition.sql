-- Kala Nilavaram — 0005: school reviews (dual-track) + teacher recognition

-- ---------------------------------------------------------------------------
-- reviews: student->school and teacher->school (Section 4D)
-- ---------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id),
  reviewer_role reviewer_role not null,
  target_type review_target_type not null,

  -- Student track only: reviews can be scoped to a named/unnamed teacher.
  -- Teacher track NEVER sets this (teachers cannot review named colleagues).
  target_teacher_name text,

  -- Student ratings: teaching, facilities, environment, safety, extracurriculars
  -- Teacher ratings: administration, management, facilities, working_environment
  ratings jsonb not null,

  body text,
  display_mode display_mode not null default 'anonymous',
  author_identity_id uuid references author_identities(id),

  status review_status not null default 'pending',
  flag_count integer not null default 0,

  created_at timestamptz not null default now(),

  constraint teacher_reviews_no_named_target check (
    reviewer_role <> 'teacher' or target_teacher_name is null
  )
);

create index idx_reviews_tenant_target on reviews(tenant_id, target_type, status);
create index idx_reviews_reviewer on reviews(reviewer_user_id);

-- Anti-gaming: rate-limit is enforced in application code (server action) +
-- this partial index helps a moderator query find review-brigading bursts.
create index idx_reviews_teacher_target_recent on reviews(tenant_id, target_teacher_name, created_at)
  where target_teacher_name is not null;

create table review_flags (
  id bigint generated always as identity primary key,
  review_id uuid not null references reviews(id) on delete cascade,
  flagged_by uuid not null references auth.users(id),
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- teacher_profiles: a teacher's public-facing profile within a tenant
-- ---------------------------------------------------------------------------
create table teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_taught text,
  years_at_school smallint,
  bio text,
  badge_status text not null default 'none',  -- 'none' | 'awarded'
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- ---------------------------------------------------------------------------
-- recognition_rounds + nominations + awards ("Best Teacher", Section 4F)
-- ---------------------------------------------------------------------------
create table recognition_rounds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  round_label text not null,             -- e.g. 'Jul-Aug 2026'
  period_start date not null,
  period_end date not null,
  interval_months smallint not null default 2,   -- admin-configurable cadence
  status recognition_round_status not null default 'open',
  scoring_notes text,                    -- published alongside winners for transparency
  created_at timestamptz not null default now()
);

create table teacher_nominations (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references recognition_rounds(id) on delete cascade,
  teacher_profile_id uuid not null references teacher_profiles(id) on delete cascade,
  nominated_by_user_id uuid references auth.users(id),  -- null = self-application
  statement text not null,
  supporting_notes text,
  created_at timestamptz not null default now()
);

create index idx_nominations_round on teacher_nominations(round_id, teacher_profile_id);

create table recognition_awards (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references recognition_rounds(id) on delete cascade,
  teacher_profile_id uuid not null references teacher_profiles(id) on delete cascade,
  -- documented, simple scoring: {review_score, nomination_score, editorial_score, total}
  score_breakdown jsonb not null,
  awarded_by uuid not null references auth.users(id),
  awarded_at timestamptz not null default now(),
  announcement_post_id uuid references posts(id),
  unique (round_id, teacher_profile_id)
);
