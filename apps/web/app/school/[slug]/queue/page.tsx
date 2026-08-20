/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/queue/page.tsx
 * PURPOSE: Per-author submission tracker. Lets a signed-in student see the
 *          posts they submitted and their editorial review status
 *          (awaiting review, published, rejected with editor feedback).
 *
 * IDENTIFIERS & SYMBOLS:
 * - STATUS_META (Record<string, ...>): Status -> label + badge styling map.
 * - SubmissionQueuePage (Async React Server Component): Scoped to the signed-in
 *   user's own posts (posts_select_own RLS), ordered newest first.
 *
 * RELATION TO APP:
 * - Companion view to the staff-only Editorial Queue (app/school/[slug]/editorial):
 *   that page is the review workbench; this page is the author-facing tracker.
 * ============================================================================
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const STATUS_META: Record<string, { label: string; badge: string }> = {
  in_review: { label: 'Awaiting editorial review', badge: 'bg-accent/15 text-accent' },
  published: { label: 'Published', badge: 'bg-teacher/15 text-teacher' },
  rejected: { label: 'Not approved', badge: 'bg-danger/15 text-danger' },
  draft: { label: 'Draft', badge: 'bg-ink-700 text-ink-300' },
  archived: { label: 'Archived', badge: 'bg-ink-700 text-ink-300' }
};

export default async function SubmissionQueuePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', params.slug)
    .maybeSingle();

  let query = supabase
    .from('posts')
    .select('id, title, category, type, status, body, editor_comments, submitted_at, published_at')
    .eq('author_user_id', auth.user.id)
    .order('submitted_at', { ascending: false });

  if (tenant?.id) {
    query = query.eq('tenant_id', tenant.id);
  }

  const { data: posts } = await query;

  const mine = (posts ?? []).filter((p) => p.status !== 'archived');
  const inReview = mine.filter((p) => p.status === 'in_review');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">📬</span>
          <h1 className="text-xl font-bold text-ink-100">My Queue</h1>
        </div>
        <p className="text-xs text-ink-300 mt-1">
          Track your submissions to {tenant?.name ?? 'your school'} as they move through the editorial review process.
        </p>
      </div>

      <div className="space-y-4">
        {mine.map((p: any) => {
          const meta = STATUS_META[p.status] ?? { label: p.status, badge: 'bg-ink-700 text-ink-300' };
          const isPublished = p.status === 'published';
          const inner = (
            <div className="flex items-center justify-between gap-3 border-b border-ink-800 pb-2.5">
              <div className="min-w-0">
                <h3 className="font-semibold text-base text-ink-100 truncate">{p.title}</h3>
                <p className="text-xs text-ink-400 mt-0.5">
                  <span className="capitalize">{p.category}</span> · Submitted{' '}
                  {p.submitted_at
                    ? new Date(p.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'recently'}
                </p>
              </div>
              <span className={`badge shrink-0 text-xs ${meta.badge}`}>{meta.label}</span>
            </div>
          );

          return (
            <article key={p.id as string} className="card space-y-3">
              {isPublished ? (
                <Link href={`/school/${params.slug}/feed/${p.id}`} className="block">
                  {inner}
                </Link>
              ) : (
                inner
              )}

              {p.status === 'in_review' && (
                <p className="text-xs text-ink-400 leading-relaxed">
                  Your story is queued for the editorial board and will be reviewed in order of
                  submission. You&apos;ll see the decision here once an editor responds.
                </p>
              )}

              {p.status === 'rejected' && p.editor_comments && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-danger uppercase tracking-wide mb-1">
                    Editor feedback
                  </p>
                  <p className="text-xs text-ink-200 leading-relaxed whitespace-pre-wrap">
                    {p.editor_comments}
                  </p>
                </div>
              )}
            </article>
          );
        })}

        {mine.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">No submissions yet</p>
            <p className="text-xs text-ink-400 mt-1">
              Submit a campus story or event announcement and it will appear here while awaiting editorial review.
            </p>
            <Link href={`/school/${params.slug}/feed/submit`} className="btn-primary mt-4 inline-block text-xs">
              Submit a post
            </Link>
          </div>
        )}
      </div>

      {inReview.length > 0 && (
        <p className="text-[11px] text-ink-500">
          {inReview.length} {inReview.length === 1 ? 'submission' : 'submissions'} currently in review.
        </p>
      )}
    </div>
  );
}
