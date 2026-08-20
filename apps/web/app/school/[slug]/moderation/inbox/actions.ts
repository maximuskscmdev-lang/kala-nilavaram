/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/moderation/inbox/actions.ts
 * PURPOSE: Server Actions for the moderator triage inbox: updating status,
 *          flagging immediate safety risk for real-world escalation, and
 *          revealing submitter contact info with mandatory audit logging.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - assertModerator (Helper): Verifies the caller possesses 'moderator' or
 *   'school_admin' role for the tenant, or super_admin privileges.
 * - updateReportStatus (Server Action): Transitions a report to under_review,
 *   verified_contacted, action_taken, escalated, or closed, logging internal
 *   and public notes.
 * - setSafetyFlag (Server Action): Flags immediate physical or psychological risk,
 *   prompting immediate offline escalation for all reviewing moderators.
 * - revealIdentity (Server Action): Audits the reason for viewing contact details,
 *   inserts a row into whistleblower_identity_access_log, and returns decrypted
 *   { real_name, phone, email }.
 * 
 * RELATION TO APP:
 * - Critical shield protecting student safety and ensuring absolute auditability
 *   of sensitive information access per Section 5.
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';
import { decryptContactInfo } from '@/lib/crypto/encryption';

async function assertModerator(slug: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated.');

  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(slug);

  if (!isSuper && (!membership || !['moderator', 'school_admin'].includes(membership.role))) {
    throw new Error('Not authorized — moderation team only.');
  }
  return {
    userId: auth.user.id,
    tenantId: membership?.tenantId
  };
}

export async function updateReportStatus(
  slug: string,
  reportId: string,
  status: 'under_review' | 'verified_contacted' | 'action_taken' | 'escalated' | 'closed',
  notePublic: string,
  noteInternal: string
) {
  const staff = await assertModerator(slug);
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from('whistleblower_reports')
    .update({ status, ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {}) })
    .eq('id', reportId);
  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await supabase.from('whistleblower_status_log').insert({
    report_id: reportId,
    status,
    note_public: notePublic || null,
    note_internal: noteInternal || null,
    moderator_id: staff.userId
  });
  if (logError) throw new Error(logError.message);

  revalidatePath(`/school/${slug}/moderation/inbox`);
}

export async function setSafetyFlag(slug: string, reportId: string, reason: string) {
  const staff = await assertModerator(slug);
  const supabase = createClient();
  const { error } = await supabase
    .from('whistleblower_reports')
    .update({
      safety_flag: true,
      safety_flag_reason: reason,
      safety_flag_set_by: staff.userId,
      safety_flag_set_at: new Date().toISOString()
    })
    .eq('id', reportId);
  if (error) throw new Error(error.message);
  revalidatePath(`/school/${slug}/moderation/inbox`);
}

export async function revealIdentity(slug: string, reportId: string, reason: string) {
  await assertModerator(slug);
  const supabase = createClient();

  // The security-definer DB function re-checks authorization against the
  // report's tenant, writes the access-log row atomically, and returns only the
  // opaque AES-GCM ciphertext — the decryption key never reaches the database.
  const { data, error } = await supabase.rpc('reveal_whistleblower_identity', {
    p_report_id: reportId,
    p_reason: reason || 'Moderator verification inquiry'
  });

  if (error) throw new Error(error.message);

  const blob = data?.[0]?.contact_encrypted;
  if (!blob) throw new Error('Report not found');

  return decryptContactInfo(blob);
}
