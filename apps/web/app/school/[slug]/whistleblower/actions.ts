/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/whistleblower/actions.ts
 * PURPOSE: Server Actions for submitting and tracking confidential student/teacher
 *          whistleblower complaints with AES-256 encrypted contact details.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - ReportSchema (Zod Schema): Validates tenantSlug, category, description,
 *   realName, phone, and optional email.
 * - TrackSchema (Zod Schema): Validates tracking ID lookup parameter.
 * - submitWhistleblowerReport (Server Action): Encrypts submitter contact info at rest,
 *   generates unique tracking ID, records the report, creates the initial status log,
 *   and redirects to the confirmation receipt page.
 * - lookupReportStatus (Server Action): Queries de-identified report status and public
 *   moderator notes using the tracking ID without requiring user authentication.
 * 
 * RELATION TO APP:
 * - Core entry point for Section 5 (whistleblower shielding). Ensures minors and
 *   staff can report institutional issues with cryptographic protection.
 * ============================================================================
 */

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { encryptContactInfo } from '@/lib/crypto/encryption';

const ReportSchema = z.object({
  tenantSlug: z.string(),
  category: z.enum(['harassment', 'safety', 'financial_administrative', 'facilities', 'discrimination', 'other']),
  description: z.string().min(20).max(8000),
  realName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal(''))
});

export async function submitWhistleblowerReport(formData: FormData) {
  const parsed = ReportSchema.parse({
    tenantSlug: formData.get('tenantSlug'),
    category: formData.get('category'),
    description: formData.get('description'),
    realName: formData.get('realName'),
    phone: formData.get('phone'),
    email: formData.get('email') || ''
  });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', parsed.tenantSlug)
    .single();

  if (!tenant) throw new Error('School not found');

  // The audited DB function requires a verified student/teacher membership of
  // this school (same rule as the RLS insert policy). Route new users to
  // onboarding instead of letting the report fail with a cryptic error.
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, verification_status')
    .eq('user_id', auth.user.id)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .maybeSingle();

  const isVerifiedMember =
    !!membership &&
    membership.verification_status === 'verified' &&
    (membership.role === 'student' || membership.role === 'teacher');

  if (!isVerifiedMember) {
    redirect(`/onboarding?tenant=${parsed.tenantSlug}`);
  }

  const encryptedContact = encryptContactInfo({
    real_name: parsed.realName,
    phone: parsed.phone,
    email: parsed.email || null
  });

  // Route through the audited Postgres function: it generates the tracking ID,
  // enforces verified membership, writes the report and the initial status log
  // in one security-definer step (RLS cannot be bypassed by the caller).
  const { data: trackingId, error } = await supabase.rpc('submit_whistleblower_report', {
    p_tenant_id: tenant.id,
    p_category: parsed.category,
    p_description: parsed.description,
    p_evidence_urls: [],
    p_contact_encrypted: encryptedContact
  });

  if (error) throw new Error(error.message);

  redirect(`/school/${parsed.tenantSlug}/whistleblower/confirmation?id=${trackingId}`);
}

const TrackSchema = z.object({ trackingId: z.string().min(6) });

export async function lookupReportStatus(formData: FormData) {
  const { trackingId } = TrackSchema.parse({ trackingId: formData.get('trackingId') });
  const supabase = createClient();

  // De-identified lookup via the audited function only — direct table access is
  // denied to non-staff roles by RLS, so there is no fallback to a raw query.
  const { data, error } = await supabase.rpc('get_report_status_by_tracking_id', {
    p_tracking_id: trackingId
  });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  const report = data[0];
  return {
    tracking_id: report.tracking_id,
    category: report.category,
    status: report.status,
    latest_public_note: report.latest_public_note ?? 'Under review by moderator team.',
    created_at: report.created_at,
    closed_at: report.closed_at
  };
}
