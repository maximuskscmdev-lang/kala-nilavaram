/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/moderation/reviews/page.tsx
 * PURPOSE: Restricted review moderation queue. Shows reviews awaiting action
 *          (pending or flagged) so moderators can verify, publish, flag, or
 *          remove submissions before they affect public school scorecards.
 *
 * IDENTIFIERS & SYMBOLS:
 * - ReviewModerationPage (Async React Server Component): Role-gates access,
 *   queries pending/flagged reviews for the tenant, and renders triage rows.
 *
 * RELATION TO APP:
 * - Back-office verification step for Section 4D dual-track reviews.
 * ============================================================================
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';
import { ReviewRow } from './review-row';

export default async function ReviewModerationPage({ params }: { params: { slug: string } }) {
  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(params.slug);

  if (!isSuper && (!membership || !['editor', 'moderator', 'school_admin'].includes(membership.role))) {
    redirect(`/school/${params.slug}/feed`);
  }

  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle();

  let query = supabase
    .from('reviews')
    .select('id, reviewer_role, target_type, target_teacher_name, ratings, body, display_mode, status, flag_count, created_at')
    .in('status', ['pending', 'flagged'])
    .order('created_at', { ascending: true });

  // Always scope to the school in the URL — including for super admins who have
  // no membership row of their own (previously they saw every school's queue).
  if (tenant?.id) {
    query = query.eq('tenant_id', tenant.id);
  }

  const { data: reviews } = await query;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <h1 className="text-xl font-bold text-ink-100">Review Moderation</h1>
        </div>
        <p className="text-xs text-ink-300 mt-1">
          Verify and publish pending reviews, or flag/remove submissions that breach the community guidelines.
          Only published reviews count toward public school scorecards.
        </p>
      </div>

      <div className="space-y-3">
        {(reviews ?? []).map((r) => (
          <ReviewRow key={r.id as string} slug={params.slug} review={r as any} />
        ))}

        {(!reviews || reviews.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">Queue is empty</p>
            <p className="text-xs text-ink-400 mt-1">No reviews awaiting moderation right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}