-- Kala Nilavaram — 0002: tenants, profiles, memberships, author identities

-- ---------------------------------------------------------------------------
-- tenants: one row per school "chapter"
-- ---------------------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),   -- used in /school/<slug>
  name text not null,
  city text not null default 'Chennai',
  state text not null default 'Tamil Nadu',
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  requested_by uuid,           -- auth.users.id of whoever requested the chapter
  approved_by uuid,
  created_at timestamptz not null default now()
);

comment on table tenants is 'One row per school chapter. Path-based multi-tenancy: /school/<slug>.';

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users. Real identity is ALWAYS captured here,
-- regardless of what a user chooses to publicly display (Section 4E).
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  real_name text not null,
  phone text,
  email citext,
  date_of_birth date,             -- optional; used only to infer minor status
  is_minor boolean not null default false,  -- maintained by trg_profiles_is_minor (see below)
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- is_minor is time-dependent (18-year cutoff), which Postgres rejects in a
-- stored generated column (requires IMMUTABLE), so compute it in a trigger.
create or replace function set_is_minor() returns trigger language plpgsql as $$
begin
  new.is_minor := new.date_of_birth is not null and new.date_of_birth > (current_date - interval '18 years');
  return new;
end;
$$;

create trigger trg_profiles_is_minor before insert or update of date_of_birth on profiles
  for each row execute function set_is_minor();

comment on table profiles is 'Real identity, always internal. Never exposed via any public API/select without an editor/moderator/super_admin role.';

-- ---------------------------------------------------------------------------
-- platform_admins: cross-tenant Super Admins (platform founders)
-- ---------------------------------------------------------------------------
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- memberships: a user's role within a specific tenant. A user may have
-- memberships in more than one tenant (e.g. transferred schools) but the
-- common case is one active membership.
-- ---------------------------------------------------------------------------
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role membership_role not null default 'student',
  grade smallint check (grade in (10, 11, 12)),        -- students only
  subject_taught text,                                  -- teachers only
  verification_status verification_status not null default 'unverified',
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  employment_verified_at timestamptz,                   -- teachers: stricter check
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id, role)
);

comment on table memberships is 'Role + verification state per user per tenant. verification_status=verified is required before a review counts publicly (Section 6).';

create index idx_memberships_user on memberships(user_id);
create index idx_memberships_tenant_role on memberships(tenant_id, role);

-- ---------------------------------------------------------------------------
-- author_identities: pen-name / anonymous display identity (Section 4E).
-- Pen names are unique per tenant and, once claimed, reserved to that user.
-- ---------------------------------------------------------------------------
create table author_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  display_mode display_mode not null default 'real',
  pen_name citext,
  created_at timestamptz not null default now(),
  unique (tenant_id, pen_name),
  constraint pen_name_required_if_mode check (
    (display_mode = 'pen_name' and pen_name is not null) or (display_mode <> 'pen_name')
  )
);

create index idx_author_identities_user on author_identities(user_id, tenant_id);

-- ---------------------------------------------------------------------------
-- audit_logs: generic append-only audit trail. Used for pen-name/anonymous
-- identity reveals and any other sensitive access, mirroring the
-- whistleblower-specific log in 0004.
-- ---------------------------------------------------------------------------
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,               -- e.g. 'reveal_author_identity', 'approve_post'
  target_table text not null,
  target_id text not null,
  tenant_id uuid references tenants(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_target on audit_logs(target_table, target_id);
create index idx_audit_logs_actor on audit_logs(actor_user_id);
