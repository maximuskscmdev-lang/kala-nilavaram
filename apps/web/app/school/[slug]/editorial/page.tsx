/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/editorial/page.tsx
 * PURPOSE: Student editorial board queue for reviewing community-submitted
 *          campus news, articles, and event write-ups before public broadcast.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - EditorialPage (Async React Server Component): Verifies 'editor' or 'school_admin'
 *   tenant role, queries submissions in 'in_review' status, and renders review cards.
 * 
 * RELATION TO APP:
 * - Direct implementation of Section 4A (submission -> in_review -> published/rejected).
 * ============================================================================
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';
import { attachProfileRealNames } from '@/lib/supabase/profiles';
import { ReviewRow } from './review-row';

export default async function EditorialPage({ params }: { params: { slug: string } }) {
  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(params.slug);

  if (!isSuper && (!membership || !['editor', 'school_admin'].includes(membership.role))) {
    redirect(`/school/${params.slug}/feed`);
  }

  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle();

  let query = supabase
    .from('posts')
    .select(`
      id, title, category, type, body, submitted_at, author_user_id, author_identity_id,
      author_identities:author_identity_id (display_mode, pen_name)
    `)
    .eq('status', 'in_review')
    .order('submitted_at', { ascending: true });

  // Always scope to the school in the URL — including for super admins who have
  // no membership row of their own (previously they saw every school's queue).
  if (tenant?.id) {
    query = query.eq('tenant_id', tenant.id);
  }

  const { data: posts } = await query;

  // profiles can't be embedded via author_user_id (no direct FK to profiles),
  // so resolve real names in a separate RLS-gated query.
  const postsWithAuthors = await attachProfileRealNames(supabase, posts ?? [], 'author_user_id');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">✍️</span>
          <h1 className="text-xl font-bold text-ink-100">Editorial Review Queue</h1>
        </div>
        <p className="text-xs text-ink-300 mt-1">
          Review community submissions, edit comments, and approve for public publication across the school feed.
        </p>
      </div>

      <div className="space-y-4">
        {postsWithAuthors.map((p: any) => {
          let authorDisplay = 'Student Contributor';
          if (p.author_identities?.pen_name) {
            authorDisplay = `${p.author_identities.pen_name} (Pen Name)`;
          } else if (p.author_identities?.display_mode === 'anonymous') {
            authorDisplay = 'Anonymous Submission';
          } else if (p.profiles?.real_name) {
            authorDisplay = p.profiles.real_name;
          }

          return (
            <ReviewRow
              key={p.id as string}
              slug={params.slug}
              post={{
                ...p,
                author_display: authorDisplay
              }}
            />
          );
        })}

        {(!postsWithAuthors || postsWithAuthors.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">Queue is empty</p>
            <p className="text-xs text-ink-400 mt-1">All submitted articles and events have been reviewed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
