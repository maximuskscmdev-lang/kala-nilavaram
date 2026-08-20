-- Kala Nilavaram — 0003: news/events, study hub, comments, reactions

-- ---------------------------------------------------------------------------
-- posts: campus news, aggregated news, events, announcements — one workflow.
-- ---------------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,  -- null = global/platform post
  type post_type not null,
  category text not null default 'announcements',
  title text not null,
  body text,                                    -- rich text (markdown) for original content
  cover_image_url text,
  tags text[] not null default '{}',
  status post_status not null default 'draft',

  author_user_id uuid references auth.users(id),           -- real author, always
  author_identity_id uuid references author_identities(id),-- chosen display identity
  source_label text not null default 'community',           -- 'community' | 'in_house' | 'aggregated'

  -- aggregated-news-only fields (Section 4A: never republish full text)
  source_name text,
  source_url text,
  external_published_at timestamptz,

  editor_comments text,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint aggregated_needs_source check (
    type <> 'news_aggregated' or (source_name is not null and source_url is not null)
  )
);

create index idx_posts_tenant_status on posts(tenant_id, status, published_at desc);
create index idx_posts_type_category on posts(type, category);
create index idx_posts_author on posts(author_user_id);

-- ---------------------------------------------------------------------------
-- post_comments: moderated comments on any published post
-- ---------------------------------------------------------------------------
create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  author_identity_id uuid references author_identities(id),
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible', 'flagged', 'removed')),
  created_at timestamptz not null default now()
);

create index idx_comments_post on post_comments(post_id, created_at);

-- ---------------------------------------------------------------------------
-- post_reactions
-- ---------------------------------------------------------------------------
create table post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  reaction_type text not null default 'like' check (reaction_type in ('like', 'heart', 'clap', 'insightful')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction_type)
);

-- ---------------------------------------------------------------------------
-- study_items: student/teacher-generated study hub content
-- ---------------------------------------------------------------------------
create table study_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  grade smallint not null check (grade in (10, 11, 12)),
  subject text not null,
  topic text,
  board board_type not null default 'state_board',
  item_type study_item_type not null,
  title text not null,
  body text,             -- markdown for 'note'
  file_url text,          -- 'pdf' / 'image'
  link_url text,          -- 'link'
  tags text[] not null default '{}',
  status post_status not null default 'published',   -- lighter-touch: auto-publish, post-hoc moderation
  author_user_id uuid references auth.users(id),
  author_identity_id uuid references author_identities(id),
  upvote_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_study_items_lookup on study_items(tenant_id, grade, subject, status);

create table study_upvotes (
  study_item_id uuid not null references study_items(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (study_item_id, user_id)
);

create table study_saves (
  study_item_id uuid not null references study_items(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (study_item_id, user_id)
);

-- ---------------------------------------------------------------------------
-- aggregated_news_sources: RSS/News API feed config (Section 4A)
-- ---------------------------------------------------------------------------
create table aggregated_news_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),   -- null = global source (state/national)
  name text not null,
  feed_url text not null,
  category text not null default 'national',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
