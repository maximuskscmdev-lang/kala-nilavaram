/**
 * ============================================================================
 * FILE: apps/web/app/admin/chapters/actions.ts
 * PURPOSE: Server Actions for the platform admin chapter-review queue. Super
 *          admins approve, reject, or suspend school chapter requests that
 *          arrive via /schools/new (self-serve chapter application flow).
 *
 * IDENTIFIERS & SYMBOLS:
 * - assertSuperAdmin (Helper): Rejects callers without platform_admin status.
 * - approveChapter (Server Action): Activates a pending chapter.
 * - rejectChapter (Server Action): Declines a request (status 'rejected').
 * - suspendChapter (Server Action): Pauses an active chapter.
 *
 * RELATION TO APP:
 * - Closes the activation gap: chapters previously had no admin review UI.
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/auth/roles';

async function assertSuperAdmin(): Promise<string> {
  if (!(await isSuperAdmin())) {
    throw new Error('Not authorized — platform admin only.');
  }
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not signed in.');
  return auth.user.id;
}

export async function approveChapter(tenantId: string) {
  const adminId = await assertSuperAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ status: 'active', approved_by: adminId })
    .eq('id', tenantId);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/chapters');
  revalidatePath('/schools');
}

export async function rejectChapter(tenantId: string) {
  await assertSuperAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ status: 'rejected' })
    .eq('id', tenantId);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/chapters');
  revalidatePath('/schools');
}

export async function suspendChapter(tenantId: string) {
  await assertSuperAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ status: 'suspended' })
    .eq('id', tenantId);
  if (error) throw new Error(error.message);

  revalidatePath('/admin/chapters');
  revalidatePath('/schools');
}