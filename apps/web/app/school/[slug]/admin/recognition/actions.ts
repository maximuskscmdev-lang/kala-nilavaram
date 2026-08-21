/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/admin/recognition/actions.ts
 * PURPOSE: Server Actions for scoring and granting Best Teacher Recognition awards,
 *          updating faculty badge_status to 'awarded', and generating an editorial
 *          draft announcement post.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - assertEditorOrAdmin (Helper): Checks editor, school_admin, or platform admin roles.
 * - awardTeacher (Server Action): Inserts recognition_awards row with score breakdown,
 *   marks teacher_profile as 'awarded', creates an announcement post in 'in_review',
 *   and revalidates paths.
 * 
 * RELATION TO APP:
 * - Back-office execution of Section 4F recognition program.
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';

const StartRoundSchema = z.object({
  tenantSlug: z.string(),
  roundLabel: z.string().min(3).max(80),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1)
});

export async function startRecognitionRound(formData: FormData) {
  const parsed = StartRoundSchema.parse({
    tenantSlug: formData.get('tenantSlug'),
    roundLabel: formData.get('roundLabel'),
    periodStart: formData.get('periodStart'),
    periodEnd: formData.get('periodEnd')
  });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated.');

  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(parsed.tenantSlug);
  if (!isSuper && (!membership || !['editor', 'school_admin'].includes(membership.role))) {
    throw new Error('Not authorized — editorial or admin role required.');
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', parsed.tenantSlug)
    .single();
  if (!tenant) throw new Error('School not found');

  const start = new Date(parsed.periodStart);
  const end = new Date(parsed.periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid round dates.');
  }
  if (end < start) {
    throw new Error('The round end date must be after the start date.');
  }

  // Derive cadence from the chosen dates instead of hardcoding 2 (bug #25).
  const intervalMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  const { error } = await supabase.from('recognition_rounds').insert({
    tenant_id: tenant.id,
    round_label: parsed.roundLabel,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    interval_months: intervalMonths,
    status: 'open'
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/school/${parsed.tenantSlug}/admin/recognition`);
  revalidatePath(`/school/${parsed.tenantSlug}/teachers`);
}

async function assertEditorOrAdmin(slug: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated.');

  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(slug);

  if (!isSuper && (!membership || !['editor', 'school_admin'].includes(membership.role))) {
    throw new Error('Not authorized — editorial or admin role required.');
  }

  // Resolve the tenant from the URL slug (not the membership) so super admins
  // without a membership still scope everything to the school being managed.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single();
  if (!tenant) throw new Error('School not found');

  return {
    userId: auth.user.id,
    tenantId: tenant.id
  };
}

export async function awardTeacher(
  slug: string,
  roundId: string,
  teacherProfileId: string,
  scoreBreakdown: { review_score: number; nomination_score: number; editorial_score: number; total: number }
) {
  const staff = await assertEditorOrAdmin(slug);
  const supabase = createClient();

  // The round and the teacher profile must both belong to this school — never
  // award a teacher from another chapter through a forged request. The round
  // must also still be open (bug #16).
  const { data: round } = await supabase
    .from('recognition_rounds')
    .select('id')
    .eq('id', roundId)
    .eq('tenant_id', staff.tenantId)
    .eq('status', 'open')
    .maybeSingle();
  if (!round) throw new Error('The selected recognition round is not open for this school.');

  // Validate the score breakdown server-side (bug #13) — no trusting client
  // numbers. 60/25/15 weighting must sum to total.
  const s = scoreBreakdown;
  const scores = [s.review_score, s.nomination_score, s.editorial_score, s.total];
  if (scores.some((n) => typeof n !== 'number' || Number.isNaN(n) || n < 0 || n > 100)) {
    throw new Error('Each score must be a number between 0 and 100.');
  }
  const expectedTotal = Math.round(s.review_score + s.nomination_score + s.editorial_score);
  if (s.total !== expectedTotal) {
    throw new Error(`Total (${s.total}) must equal review + nomination + editorial (${expectedTotal}).`);
  }

  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('subject_taught')
    .eq('id', teacherProfileId)
    .eq('tenant_id', staff.tenantId)
    .single();

  if (!teacher) throw new Error('The selected teacher profile does not belong to this school.');

  // Auto-generated announcement draft routed into normal editorial review
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      tenant_id: staff.tenantId,
      type: 'announcement',
      category: 'Teacher Corner',
      title: `🏆 Best Teacher Recognition: ${teacher?.subject_taught ?? 'Faculty'}`,
      body: `We are proud to recognize an outstanding educator this cycle for exceptional dedication in the classroom. Full scoring breakdown is published for community transparency: Review (${scoreBreakdown.review_score}%), Nomination (${scoreBreakdown.nomination_score}%), Editorial (${scoreBreakdown.editorial_score}%). Total: ${scoreBreakdown.total}/100.`,
      status: 'in_review',
      author_user_id: staff.userId,
      source_label: 'in_house',
      submitted_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (postError) throw new Error(postError.message);

  const { error } = await supabase.from('recognition_awards').insert({
    round_id: roundId,
    teacher_profile_id: teacherProfileId,
    score_breakdown: scoreBreakdown,
    awarded_by: staff.userId,
    announcement_post_id: post.id
  });

  if (error) throw new Error(error.message);

  const { error: badgeError } = await supabase
    .from('teacher_profiles')
    .update({ badge_status: 'awarded' })
    .eq('id', teacherProfileId);
  if (badgeError) throw new Error(badgeError.message);

  revalidatePath(`/school/${slug}/teachers`);
  revalidatePath(`/school/${slug}/admin/recognition`);
}
