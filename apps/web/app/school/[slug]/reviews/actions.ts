/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/reviews/actions.ts
 * PURPOSE: Server Actions for submitting student and teacher reviews, enforcing
 *          anti-brigading 30-day rate limits and role-specific constraint checks.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - StudentReviewSchema (Zod Schema): Validates teaching, facilities, environment,
 *   safety, extracurricular ratings (1-5).
 * - TeacherReviewSchema (Zod Schema): Validates administration, management,
 *   facilities, working environment ratings (1-5).
 * - assertRateLimit (Helper): Enforces maximum 1 review per school per user per 30 days.
 * - submitStudentReview (Server Action): Inserts review in 'pending' status for moderation.
 * - submitTeacherReview (Server Action): Enforces target_teacher_name = null per Section 4D policy.
 * 
 * RELATION TO APP:
 * - Dual-track review processing engine with Postgres constraint parity.
 * ============================================================================
 */

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isWithinPeriod, REVIEW_RATE_LIMIT, withinRateLimit, windowStart } from '@/lib/rate-limit';

const StudentReviewSchema = z
  .object({
    tenantSlug: z.string(),
    targetTeacherName: z.string().optional(),
    teaching: z.coerce.number().min(1).max(5),
    facilities: z.coerce.number().min(1).max(5),
    environment: z.coerce.number().min(1).max(5),
    safety: z.coerce.number().min(1).max(5),
    extracurriculars: z.coerce.number().min(1).max(5),
    body: z.string().max(4000).optional(),
    displayMode: z.enum(['real', 'pen_name', 'anonymous']),
    penName: z.string().max(40).optional()
  })
  .refine((v) => v.displayMode !== 'pen_name' || (v.penName && v.penName.trim().length > 0), {
    message: 'Please enter a pen name',
    path: ['penName']
  });

const TeacherReviewSchema = z
  .object({
    tenantSlug: z.string(),
    administration: z.coerce.number().min(1).max(5),
    management: z.coerce.number().min(1).max(5),
    facilities: z.coerce.number().min(1).max(5),
    workingEnvironment: z.coerce.number().min(1).max(5),
    body: z.string().max(4000).optional(),
    displayMode: z.enum(['real', 'pen_name', 'anonymous']),
    penName: z.string().max(40).optional()
  })
  .refine((v) => v.displayMode !== 'pen_name' || (v.penName && v.penName.trim().length > 0), {
    message: 'Please enter a pen name',
    path: ['penName']
  });

async function assertRateLimit(supabase: ReturnType<typeof createClient>, userId: string, tenantId: string) {
  const now = new Date();
  const since = windowStart(now, REVIEW_RATE_LIMIT.periodMs);
  const { data, count } = await supabase
    .from('reviews')
    .select('created_at', { count: 'exact' })
    .eq('reviewer_user_id', userId)
    .eq('tenant_id', tenantId)
    .gte('created_at', since);

  const inWindow = (data ?? []).filter((r) => isWithinPeriod(r.created_at, now, REVIEW_RATE_LIMIT.periodMs)).length;
  if (!withinRateLimit(Math.max(inWindow, count ?? 0), REVIEW_RATE_LIMIT.maxPerPeriod)) {
    throw new Error('You can submit at most one review per school every 30 days.');
  }
}

async function assertVerifiedMember(tenantSlug: string): Promise<{ supabase: ReturnType<typeof createClient>; userId: string; tenantId: string }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single();
  if (!tenant) throw new Error('School not found');

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, verification_status')
    .eq('user_id', auth.user.id)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .maybeSingle();

  const isVerified =
    !!membership &&
    membership.verification_status === 'verified' &&
    (membership.role === 'student' || membership.role === 'teacher');

  if (!isVerified) {
    redirect(`/onboarding?tenant=${tenantSlug}`);
  }

  return { supabase, userId: auth.user.id, tenantId: tenant.id as string };
}

async function resolveAuthorIdentity(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tenantId: string,
  displayMode: 'real' | 'pen_name' | 'anonymous',
  penName?: string
): Promise<string | null> {
  if (displayMode === 'real') return null;

  const { data: existing } = await supabase
    .from('author_identities')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('display_mode', displayMode)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from('author_identities')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      display_mode: displayMode,
      pen_name: displayMode === 'pen_name' ? penName : null
    })
    .select('id')
    .single();

  if (error && error.message.includes('unique')) {
    const { data: mine } = await supabase
      .from('author_identities')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('display_mode', 'pen_name')
      .eq('pen_name', penName!)
      .maybeSingle();
    if (mine) return mine.id as string;
    throw new Error('That pen name is already taken in this school — pick a different one.');
  }
  if (error) throw new Error(error.message);

  return created?.id ?? null;
}

export async function submitStudentReview(formData: FormData) {
  const parsed = StudentReviewSchema.parse(Object.fromEntries(formData));
  const { supabase, userId, tenantId } = await assertVerifiedMember(parsed.tenantSlug);

  await assertRateLimit(supabase, userId, tenantId);

  const authorIdentityId = await resolveAuthorIdentity(
    supabase,
    userId,
    tenantId,
    parsed.displayMode,
    parsed.penName
  );

  const { error } = await supabase.from('reviews').insert({
    tenant_id: tenantId,
    reviewer_user_id: userId,
    reviewer_role: 'student',
    target_type: parsed.targetTeacherName ? 'teacher' : 'school',
    target_teacher_name: parsed.targetTeacherName || null,
    ratings: {
      teaching: parsed.teaching,
      facilities: parsed.facilities,
      environment: parsed.environment,
      safety: parsed.safety,
      extracurriculars: parsed.extracurriculars
    },
    body: parsed.body,
    display_mode: parsed.displayMode,
    author_identity_id: authorIdentityId,
    status: 'pending'
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/school/${parsed.tenantSlug}/reviews`);
  redirect(`/school/${parsed.tenantSlug}/reviews?submitted=1`);
}

export async function submitTeacherReview(formData: FormData) {
  const parsed = TeacherReviewSchema.parse(Object.fromEntries(formData));
  const { supabase, userId, tenantId } = await assertVerifiedMember(parsed.tenantSlug);

  await assertRateLimit(supabase, userId, tenantId);

  const authorIdentityId = await resolveAuthorIdentity(
    supabase,
    userId,
    tenantId,
    parsed.displayMode,
    parsed.penName
  );

  const { error } = await supabase.from('reviews').insert({
    tenant_id: tenantId,
    reviewer_user_id: userId,
    reviewer_role: 'teacher',
    target_type: 'school',
    target_teacher_name: null,
    ratings: {
      administration: parsed.administration,
      management: parsed.management,
      facilities: parsed.facilities,
      working_environment: parsed.workingEnvironment
    },
    body: parsed.body,
    display_mode: parsed.displayMode,
    author_identity_id: authorIdentityId,
    status: 'pending'
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/school/${parsed.tenantSlug}/reviews`);
  redirect(`/school/${parsed.tenantSlug}/reviews?submitted=1`);
}
