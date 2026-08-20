/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/moderation/reviews/actions.ts
 * PURPOSE: Server Actions for the review moderation queue: publishing pending
 *          reviews, flagging suspicious ones, and removing policy-violating ones.
 *
 * IDENTIFIERS & SYMBOLS:
 * - assertModerator (Helper): Requires editor/moderator/school_admin or super admin.
 * - publishReview (Server Action): Flips a review to 'published' (counts publicly).
 * - flagReview (Server Action): Marks a review 'flagged', records a review_flags
 *   row with the moderator's reason, and bumps flag_count.
 * - removeReview (Server Action): Hides a review via 'removed' status.
 *
 * RELATION TO APP:
 * - Closes the Section 4D verification loop: reviews land in 'pending' and were
 *   previously stuck with no UI to publish/flag/remove them.
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';

async function assertModerator(slug: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated.');

  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(slug);

  if (!isSuper && (!membership || !['editor', 'moderator', 'school_admin'].includes(membership.role))) {
    throw new Error('Not authorized — moderation team only.');
  }
  return {
    userId: auth.user.id,
    tenantId: membership?.tenantId
  };
}

export async function publishReview(slug: string, reviewId: string) {
  await assertModerator(slug);
  const supabase = createClient();

  const { error } = await supabase.from('reviews').update({ status: 'published' }).eq('id', reviewId);
  if (error) throw new Error(error.message);

  revalidatePath(`/school/${slug}/moderation/reviews`);
  revalidatePath(`/school/${slug}/reviews`);
}

export async function flagReview(slug: string, reviewId: string, reason: string) {
  const staff = await assertModerator(slug);
  const supabase = createClient();

  const { data: review } = await supabase
    .from('reviews')
    .select('flag_count')
    .eq('id', reviewId)
    .maybeSingle();

  const { error: flagError } = await supabase.from('review_flags').insert({
    review_id: reviewId,
    flagged_by: staff.userId,
    reason: reason || 'Not specified'
  });
  if (flagError) throw new Error(flagError.message);

  const { error: updateError } = await supabase
    .from('reviews')
    .update({ status: 'flagged', flag_count: (review?.flag_count ?? 0) + 1 })
    .eq('id', reviewId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/school/${slug}/moderation/reviews`);
  revalidatePath(`/school/${slug}/reviews`);
}

export async function removeReview(slug: string, reviewId: string) {
  await assertModerator(slug);
  const supabase = createClient();

  const { error } = await supabase.from('reviews').update({ status: 'removed' }).eq('id', reviewId);
  if (error) throw new Error(error.message);

  revalidatePath(`/school/${slug}/moderation/reviews`);
  revalidatePath(`/school/${slug}/reviews`);
}