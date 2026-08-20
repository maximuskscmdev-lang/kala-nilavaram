/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/editorial/actions.ts
 * PURPOSE: Server Actions for editorial gatekeeping: approving submissions to 'published'
 *          status and rejecting with author-routed feedback comments.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - assertEditor (Helper): Verifies the caller is an editor, school_admin, or platform super admin.
 * - approvePost (Server Action): Flips status to 'published', records reviewer ID and timestamps,
 *   and revalidates the editorial queue and live feed.
 * - rejectPost (Server Action): Flips status to 'rejected' and records editor comments.
 * 
 * RELATION TO APP:
 * - Direct execution of Section 4A editorial review pipeline.
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';

async function assertEditor(slug: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated.');

  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(slug);

  if (!isSuper && (!membership || !['editor', 'school_admin'].includes(membership.role))) {
    throw new Error('Not authorized — editorial team only.');
  }

  return {
    userId: auth.user.id
  };
}

export async function approvePost(slug: string, postId: string) {
  const staff = await assertEditor(slug);
  const supabase = createClient();

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'published',
      reviewed_by: staff.userId,
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) throw new Error(error.message);

  revalidatePath(`/school/${slug}/editorial`);
  revalidatePath(`/school/${slug}/feed`);
}

export async function rejectPost(slug: string, postId: string, comment: string) {
  const staff = await assertEditor(slug);
  const supabase = createClient();

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'rejected',
      reviewed_by: staff.userId,
      reviewed_at: new Date().toISOString(),
      editor_comments: comment
    })
    .eq('id', postId);

  if (error) throw new Error(error.message);

  revalidatePath(`/school/${slug}/editorial`);
}

export type ReviewActionState = { error: string | null };

/**
 * Form-action wrappers for useFormState in review-row.tsx. Form actions refresh
 * the current route automatically after they complete, so the queue updates
 * without relying on event-handler calls or router.refresh().
 */
export async function approvePostAction(
  _prev: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  try {
    await approvePost(String(formData.get('slug')), String(formData.get('postId')));
    return { error: null };
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to approve post.' };
  }
}

export async function rejectPostAction(
  _prev: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  try {
    await rejectPost(
      String(formData.get('slug')),
      String(formData.get('postId')),
      String(formData.get('comment') ?? '')
    );
    return { error: null };
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to reject post.' };
  }
}
