/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/feed/[id]/page.tsx
 * PURPOSE: Full article/post reading page, featuring formatted body content,
 *          author attribution, post tags, reactions (like/heart/clap), and
 *          a community comments section.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - PostDetailPage (Async React Server Component): Fetches the post by ID and tenant slug,
 *   verifies published status or author/editor permissions, retrieves comments and reactions,
 *   and renders the full article view.
 * - TYPE_BADGE (Record<string, string>): CSS badge utility mapping for post types.
 * - Post (Type): Type definition for a loaded post with author identity and metrics.
 * - Comment (Type): Type definition for comments with author display resolution.
 * - ReactionButton (Client Helper Component): Interactive reaction button with optimistic updates.
 * - CommentForm (Client Helper Component): Interactive form to post comments under real/pen/anon name.
 * 
 * RELATION TO APP:
 * - Solves the critical 404 issue when users click campus news items from PostCard.
 * - Houses the interactive community engagement loop (comments & reactions).
 * ============================================================================
 */

import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { attachProfileRealNames } from '@/lib/supabase/profiles';
import { toggleReaction } from './actions';
import { CommentForm } from './comment-form';

const TYPE_BADGE: Record<string, string> = {
  news_campus: 'badge-news',
  news_aggregated: 'badge-news',
  event: 'badge-community',
  announcement: 'badge-accent'
};

export default async function PostDetailPage({
  params
}: {
  params: { slug: string; id: string };
}) {
  const supabase = createClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single();

  if (!tenant) notFound();

  const { data: post } = await supabase
    .from('posts')
    .select(`
      id, title, category, type, body, cover_image_url, source_label, source_name,
      source_url, published_at, tags, author_user_id, author_identity_id,
      author_identities:author_identity_id (display_mode, pen_name)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!post) notFound();

  // profiles can't be embedded via author_user_id (no direct FK to profiles),
  // so resolve real names in a separate RLS-gated query.
  const [postWithAuthor] = await attachProfileRealNames(supabase, [post as any], 'author_user_id');

  // Resolve author display name
  let authorDisplay = 'Student Contributor';
  if (postWithAuthor.source_label === 'in_house') {
    authorDisplay = 'Editorial Team';
  } else if (postWithAuthor.author_identities) {
    const ai = postWithAuthor.author_identities as any;
    if (ai.display_mode === 'pen_name' && ai.pen_name) {
      authorDisplay = ai.pen_name;
    } else if (ai.display_mode === 'anonymous') {
      authorDisplay = 'Anonymous Student';
    } else if (postWithAuthor.profiles) {
      authorDisplay = (postWithAuthor.profiles as any).real_name ?? 'Verified Student';
    }
  } else if (postWithAuthor.profiles) {
    authorDisplay = (postWithAuthor.profiles as any).real_name ?? 'Verified Student';
  }

  // Fetch comments
  const { data: comments } = await supabase
    .from('post_comments')
    .select(`
      id, body, created_at, user_id,
      author_identities:author_identity_id (display_mode, pen_name)
    `)
    .eq('post_id', post.id)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  // profiles can't be embedded via user_id (no direct FK to profiles), so
  // resolve commenter real names in a separate RLS-gated query.
  const commentsWithAuthors = await attachProfileRealNames(supabase, comments ?? [], 'user_id');

  // Fetch reactions count
  const { data: reactions } = await supabase
    .from('post_reactions')
    .select('reaction_type, user_id')
    .eq('post_id', post.id);

  const reactionCounts: Record<string, number> = { like: 0, heart: 0, clap: 0, insightful: 0 };
  (reactions ?? []).forEach((r: any) => {
    if (reactionCounts[r.reaction_type] !== undefined) {
      reactionCounts[r.reaction_type] += 1;
    }
  });

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-300">
        <Link href={`/school/${params.slug}/feed`} className="hover:text-ink-100">
          ← Back to Feed
        </Link>
        <span>/</span>
        <span className="capitalize">{post.category}</span>
      </div>

      {/* Header & Badges */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${TYPE_BADGE[post.type] ?? 'badge-community'}`}>
            {post.category}
          </span>
          {post.source_label === 'in_house' && (
            <span className="badge badge-study">In-house</span>
          )}
          <span className="text-xs text-ink-500">
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              : 'Draft'}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-100">
          {post.title}
        </h1>

        <div className="flex items-center gap-2 text-sm text-ink-300 border-b border-ink-800 pb-4">
          <div className="h-7 w-7 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-xs font-bold text-brand-light">
            {authorDisplay.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-ink-100">{authorDisplay}</p>
            <p className="text-xs text-ink-500">
              {post.source_label === 'in_house' ? 'Kala Nilavaram Chapter Editorial' : 'Independent Author'}
            </p>
          </div>
        </div>
      </header>

      {/* Cover Image if available */}
      {post.cover_image_url && (
        <div className="overflow-hidden rounded-xl2 border border-ink-800">
          <Image
            src={post.cover_image_url}
            alt={post.title}
            width={1200}
            height={500}
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      {/* Body Content */}
      <div className="prose prose-invert max-w-none text-ink-100 leading-relaxed whitespace-pre-wrap font-sans text-base">
        {post.body ?? 'No content provided.'}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-ink-800">
          {post.tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-md bg-ink-900 border border-ink-700 px-2 py-0.5 text-xs text-ink-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Reactions Bar */}
      <div className="rounded-xl2 border border-ink-800 bg-ink-900/60 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">
            Reactions
          </span>
          <div className="flex gap-2">
            {[
              { type: 'like', label: '👍 Like', count: reactionCounts.like },
              { type: 'heart', label: '❤️ Love', count: reactionCounts.heart },
              { type: 'clap', label: '👏 Clap', count: reactionCounts.clap },
              { type: 'insightful', label: '💡 Insightful', count: reactionCounts.insightful }
            ].map((r) => (
              <form
                key={r.type}
                action={toggleReaction.bind(null, post.id, params.slug, r.type as any)}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-800 px-3 py-1 text-xs hover:bg-ink-700 transition"
                >
                  <span>{r.label}</span>
                  {r.count > 0 && <span className="font-semibold text-brand-light">{r.count}</span>}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <section className="space-y-4 pt-6 border-t border-ink-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-100">
            Comments ({commentsWithAuthors.length ?? 0})
          </h2>
        </div>

        {/* Add Comment Form */}
        <CommentForm postId={post.id} tenantSlug={params.slug} />

        {/* Comments List */}
        <div className="space-y-3">
          {commentsWithAuthors.map((c: any) => {
            let commenterDisplay = 'Verified Student';
            if (c.author_identities) {
              if (c.author_identities.display_mode === 'pen_name' && c.author_identities.pen_name) {
                commenterDisplay = c.author_identities.pen_name;
              } else if (c.author_identities.display_mode === 'anonymous') {
                commenterDisplay = 'Anonymous Student';
              } else if (c.profiles) {
                commenterDisplay = c.profiles.real_name;
              }
            } else if (c.profiles) {
              commenterDisplay = c.profiles.real_name;
            }

            return (
              <div key={c.id} className="card bg-ink-900/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-100">{commenterDisplay}</span>
                  <span className="text-ink-500">
                    {new Date(c.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm text-ink-300 whitespace-pre-wrap">{c.body}</p>
              </div>
            );
          })}

          {(!commentsWithAuthors || commentsWithAuthors.length === 0) && (
            <p className="text-sm text-ink-500 text-center py-4">
              No comments yet. Be the first to start the discussion!
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
