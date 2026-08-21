/**
 * ============================================================================
 * FILE: apps/web/components/post-card.tsx
 * PURPOSE: Reusable feed preview card component for campus news, events,
 *          announcements, and aggregated media articles.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - Post (Type): Shape of a feed post with category, type, author byline, and timestamps.
 * - TYPE_BADGE (Record<string, string>): CSS badge utility mapping for post types.
 * - PostCard (React Component): Renders the post preview, routing internal stories
 *   to /school/[slug]/feed/[id] and external aggregated stories to source_url in a new tab.
 * 
 * RELATION TO APP:
 * - Primary UI representation for all feed content across school chapters.
 * ============================================================================
 */

import Link from 'next/link';

// Only allow http(s) outbound links. A malicious/compromised RSS source could
// supply `javascript:`/`data:` URLs; React does not sanitize href, so we reject
// anything that is not a safe web URL (bug #9 — stored XSS via source_url).
function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return url;
  } catch {
    /* not a valid URL */
  }
  return null;
}

type Post = {
  id: string;
  title: string;
  category: string;
  type: string;
  cover_image_url?: string | null;
  source_label: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  tags?: string[];
  display_name: string;
};

const TYPE_BADGE: Record<string, string> = {
  news_campus: 'badge-news',
  news_aggregated: 'badge-news',
  event: 'badge-community',
  announcement: 'badge-accent'
};

export function PostCard({ post, slug }: { post: Post; slug: string }) {
  const isAggregated = post.type === 'news_aggregated';

  return (
    <article className="card transition-all duration-200 hover:border-ink-600 hover:bg-ink-900/90 group">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`badge ${TYPE_BADGE[post.type] ?? 'badge-community'}`}>
            {post.category}
          </span>
          {post.source_label === 'in_house' && (
            <span className="badge badge-study font-semibold">In-house</span>
          )}
        </div>
        <span className="text-[11px] text-ink-500">
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })
            : 'Draft'}
        </span>
      </div>

      {isAggregated ? (
        <a
          href={safeExternalUrl(post.source_url) ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block space-y-1"
        >
          <h3 className="font-semibold text-base text-ink-100 group-hover:text-brand-light transition">
            {post.title} ↗
          </h3>
          <p className="text-xs text-ink-400">
            Source: {post.source_name ?? 'External News'} · Outbound report
          </p>
        </a>
      ) : (
        <Link href={`/school/${slug}/feed/${post.id}`} className="block space-y-1">
          <h3 className="font-semibold text-base text-ink-100 group-hover:text-brand-light transition">
            {post.title}
          </h3>
          <p className="text-xs text-ink-400">
            By <span className="font-medium text-ink-300">{post.display_name}</span>
          </p>
        </Link>
      )}
    </article>
  );
}
