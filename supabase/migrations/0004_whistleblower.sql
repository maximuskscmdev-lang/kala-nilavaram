-- Kala Nilavaram — 0004: whistleblower / complaint inbox
-- Model: identity-captured-but-shielded (Section 5). Contact details are
-- encrypted at rest with pgcrypto (pgp_sym_encrypt) using a server-only key
-- (WHISTLEBLOWER_ENCRYPTION_KEY) that never reaches the database role used
-- by the client. Only the service-role server action can decrypt.

create table whistleblower_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  tracking_id text unique not null,       -- e.g. KN-2026-8F3K2Q, shown to submitter only

  category whistleblower_category not null,
  description text not null check (char_length(description) between 20 and 8000),
  evidence_urls text[] not null default '{}',

  -- Submitter is a verified student or teacher (Section 4C). We still store
  -- the auth user id for rate-limiting/abuse detection, but it is NEVER
  -- joined to profiles in any client-facing query — only via the dedicated
  -- reveal function below, which is audit-logged.
  submitter_user_id uuid references auth.users(id),
  contact_encrypted bytea not null,        -- pgp_sym_encrypt(name || phone/email)

  status whistleblower_status not null default 'received',
  safety_flag boolean not null default false,
  safety_flag_reason text,
  safety_flag_set_by uuid references auth.users(id),
  safety_flag_set_at timestamptz,

  assigned_moderator_ids uuid[] not null default '{}',
  public_closure_summary text,             -- fully de-identified, editor-written

  created_at timestamptz not null default now(),
  closed_at timestamptz,

  -- retention: identifying contact info can be purged once closed + the
  -- submitter-requested or default retention window has elapsed (docs/policies).
  identity_purge_requested_at timestamptz,
  identity_purged_at timestamptz
);

-- Never index in search engines, never exposed via any public API/select.
comment on table whistleblower_reports is
  'Most sensitive table on the platform. RLS restricts SELECT to assigned moderators, school_admins of the tenant, and super_admins. Public status lookup goes through the get_report_status_by_tracking_id() function only, which returns a de-identified row.';

create index idx_whistleblower_tenant_status on whistleblower_reports(tenant_id, status);
create index idx_whistleblower_tracking on whistleblower_reports(tracking_id);

-- ---------------------------------------------------------------------------
-- whistleblower_status_log: full audit trail of status changes
-- ---------------------------------------------------------------------------
create table whistleblower_status_log (
  id bigint generated always as identity primary key,
  report_id uuid not null references whistleblower_reports(id) on delete cascade,
  status whistleblower_status not null,
  note_internal text,           -- visible to moderators only
  note_public text,             -- shown on the tracking-ID lookup, de-identified
  moderator_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_wb_status_log_report on whistleblower_status_log(report_id, created_at);

-- ---------------------------------------------------------------------------
-- whistleblower_identity_access_log: every time a moderator decrypts/views
-- submitter contact details, it is logged here (Section 5, non-negotiable).
-- ---------------------------------------------------------------------------
create table whistleblower_identity_access_log (
  id bigint generated always as identity primary key,
  report_id uuid not null references whistleblower_reports(id) on delete cascade,
  moderator_id uuid not null references auth.users(id),
  reason text not null,
  accessed_at timestamptz not null default now()
);

create index idx_wb_identity_log_report on whistleblower_identity_access_log(report_id);
