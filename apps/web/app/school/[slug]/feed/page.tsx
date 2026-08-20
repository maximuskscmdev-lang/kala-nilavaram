/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/feed/page.tsx
 * PURPOSE: Main multi-tenant campus and aggregated news feed. Displays articles,
 *          events, announcements, and state/national education news with
 *          editorial bylines and category/scope filters.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - CATEGORIES (string[]): Filterable content categories (Academics, School Events,
 *   Sports, Announcements, Opinion, Teacher Corner).
 * - SCOPES (tuple): Scope filters: 'school' (My School), 'all' (All Schools),
 *   'state' (Tamil Nadu State Education News), 'national' (National Education News).
 * - FeedPage (Async React Server Component): Queries published posts for the tenant
 *   or aggregated sources, resolves author display names, and renders PostCards.
 * - resolveAuthorDisplayName (Helper): Resolves display name based on pen name,
 *   real name, editorial in-house tag, or anonymous attribution per Section 4E.
 * 
 * RELATION TO APP:
 * - Central hub for student news, transparency stories, and chapter communications.
 * ============================================================================
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { attachProfileRealNames } from '@/lib/supabase/profiles';
import { PostCard } from '@/components/post-card';

const CATEGORIES = ['All', 'Academics', 'School Events', 'Sports', 'Announcements', 'Opinion', 'Teacher Corner'];

function resolveAuthorDisplayName(p: any): string {
  if (p.source_label === 'in_house') return 'Editorial Team';
  if (p.source_label === 'aggregated') return p.source_name ?? 'News Feed';
  if (p.author_identities) {
    if (p.author_identities.display_mode === 'pen_name' && p.author_identities.pen_name) {
      return p.author_identities.pen_name;
    }
    if (p.author_identities.display_mode === 'anonymous') {
      return 'Anonymous Student';
    }
  }
  if (p.profiles?.real_name) {
    return p.profiles.real_name;
  }
  return 'Student Contributor';
}

export default async function FeedPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { category?: string; scope?: 'school' | 'all' | 'state' | 'national' };
}) {
  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', params.slug)
    .maybeSingle();

  let query = supabase
    .from('posts')
    .select(`
      id, title, category, type, cover_image_url, source_label, source_name,
      source_url, published_at, external_published_at, tags, author_user_id, author_identity_id,
      author_identities:author_identity_id (display_mode, pen_name)
    `)
    .eq('status', 'published');

  const scope = searchParams.scope ?? 'school';
  if (scope === 'school' && tenant?.id) {
    query = query.eq('tenant_id', tenant.id);
  }
  if (scope === 'state') query = query.eq('type', 'news_aggregated').eq('category', 'state');
  if (scope === 'national') query = query.eq('type', 'news_aggregated').eq('category', 'national');

  // Content categories only apply to campus (school/all) posts — aggregated
  // news rows use the reserved 'state'/'national' category values, so applying
  // the pill filter here would contradict the scope filter and return nothing.
  const isCampusScope = scope === 'school' || scope === 'all';
  if (isCampusScope && searchParams.category && searchParams.category !== 'All') {
    query = query.eq('category', searchParams.category);
  }

  // Aggregated news is sorted by the article's real publication time (from the
  // RSS feed); campus posts by when the editorial workflow published them.
  if (scope === 'state' || scope === 'national') {
    query = query.order('external_published_at', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('published_at', { ascending: false });
  }
  query = query.limit(30);

  const { data: posts } = await query;

  // profiles can't be embedded via author_user_id (no direct FK to profiles),
  // so resolve real names in a separate RLS-gated query.
  const postsWithAuthors = await attachProfileRealNames(supabase, posts ?? [], 'author_user_id');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Feed</h1>
          <p className="text-xs text-ink-300">Ground reality updates and stories from {tenant?.name ?? 'your school'}.</p>
        </div>
        <Link href={`/school/${params.slug}/feed/submit`} className="btn-primary text-xs shadow-sm hover:shadow-brand/20">
          Submit a post
        </Link>
      </div>

      {/* Scope Selector */}
      <div className="mb-3 flex gap-2 overflow-x-auto text-xs pb-1">
        {(['school', 'all', 'state', 'national'] as const).map((s) => (
          <Link
            key={s}
            href={`?scope=${s}${searchParams.category ? `&category=${searchParams.category}` : ''}`}
            className={`whitespace-nowrap rounded-full border px-3 py-1 font-medium transition ${
              scope === s
                ? 'border-brand bg-brand/15 text-brand-light shadow-sm'
                : 'border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100'
            }`}
          >
            {s === 'school' ? 'My School' : s === 'all' ? 'All Schools' : s === 'state' ? 'State News' : 'National News'}
          </Link>
        ))}
      </div>

      {/* Category Pills (campus content only — aggregated news has its own scope) */}
      {isCampusScope && (
        <div className="mb-6 flex gap-2 overflow-x-auto text-xs pb-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`?scope=${scope}&category=${c}`}
              className={`whitespace-nowrap rounded-full px-3 py-1 font-medium transition ${
                (searchParams.category ?? 'All') === c
                  ? 'bg-ink-100 text-ink-950 shadow-sm'
                  : 'bg-ink-800/80 text-ink-300 hover:bg-ink-700 hover:text-ink-100'
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {/* Posts Listing */}
      <div className="space-y-3">
        {postsWithAuthors.map((p: any) => (
          <PostCard
            key={p.id as string}
            slug={params.slug}
            post={{
              ...p,
              display_name: resolveAuthorDisplayName(p)
            }}
          />
        ))}
        {(!postsWithAuthors || postsWithAuthors.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">
              {isCampusScope ? 'Nothing published here yet.' : 'No news stories available right now.'}
            </p>
            <p className="text-xs text-ink-300 mt-1">
              {isCampusScope
                ? 'Be the first to submit a campus story or event announcement.'
                : 'Check back soon — our news aggregation sources are refreshed regularly.'}
            </p>
            {isCampusScope && (
              <Link
                href={`/school/${params.slug}/feed/submit`}
                className="btn-primary mt-4 inline-block text-xs"
              >
                Submit first post
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
