/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/teachers/nominate/actions.ts
 * PURPOSE: Server Actions for processing student and peer nominations during active
 *          teacher recognition rounds.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - NominationSchema (Zod Schema): Validates roundId, tenantSlug, teacherProfileId,
 *   subjectTaught, yearsAtSchool (0-60), statement (30-2000 chars), supportingNotes.
 * - nominateTeacher (Server Action): Inserts nomination record linked to the authenticated
 *   student user ID and redirects to /school/[slug]/teachers?nominated=1.
 * 
 * RELATION TO APP:
 * - Direct intake for Section 4F recognition cycles.
 * ============================================================================
 */

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const NominationSchema = z.object({
  roundId: z.string().optional(),
  tenantSlug: z.string(),
  teacherProfileId: z.string().uuid().or(z.string().min(1)),
  subjectTaught: z.string().min(1),
  yearsAtSchool: z.coerce.number().min(0).max(60),
  statement: z.string().min(30).max(2000),
  supportingNotes: z.string().max(2000).optional()
});

export async function nominateTeacher(formData: FormData) {
  const parsed = NominationSchema.parse(Object.fromEntries(formData));
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  if (!parsed.teacherProfileId) throw new Error('Please select a teacher to nominate.');

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', parsed.tenantSlug).maybeSingle();
  if (!tenant) throw new Error('School not found');

  // Nominations are RLS-gated to verified members of this school — route new
  // users to onboarding instead of a cryptic insert failure.
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
    redirect(`/onboarding?tenant=${parsed.tenantSlug}`);
  }

  let roundId = parsed.roundId;
  if (!roundId || !roundId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data: openRound } = await supabase
      .from('recognition_rounds')
      .select('id')
      .eq('tenant_id', tenant.id)
.eq('status', 'open')
      .limit(1)
      .maybeSingle();
    roundId = openRound?.id as string | undefined;
  }

  if (!roundId) throw new Error('No active recognition round is open for this school right now.');

  const { data: round } = await supabase
    .from('recognition_rounds')
    .select('id')
    .eq('id', roundId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'open')
    .maybeSingle();

  if (!round) throw new Error('The selected recognition round is not open for this school.');

  const { error } = await supabase.from('teacher_nominations').insert({
    round_id: roundId,
    teacher_profile_id: parsed.teacherProfileId,
    nominated_by_user_id: auth.user.id,
    statement: parsed.statement,
    supporting_notes: parsed.supportingNotes || null
  });
  if (error) throw new Error(error.message);

  redirect(`/school/${parsed.tenantSlug}/teachers?nominated=1`);
}
