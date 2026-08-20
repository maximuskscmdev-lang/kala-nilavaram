/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/teachers/nominate/page.tsx
 * PURPOSE: Student and peer nomination form for the active Best Teacher
 *          recognition cycle, capturing qualitative statements and years of service.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - NominateTeacherPage (Async React Server Component): Fetches verified teachers
 *   for the tenant along with their profile real names, and renders the nomination form.
 * 
 * RELATION TO APP:
 * - Direct implementation of Section 4F (25% nomination quality component).
 * ============================================================================
 */

import { createClient } from '@/lib/supabase/server';
import { attachProfileRealNames } from '@/lib/supabase/profiles';
import { NominateForm } from './nominate-form';

export default async function NominateTeacherPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { round?: string };
}) {
  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!tenant) {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-sm text-ink-300">School not found.</p>
      </div>
    );
  }

  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select(`
      id, user_id, subject_taught
    `)
    .eq('tenant_id', tenant.id);

  const teachersWithAuthors = await attachProfileRealNames(supabase, teachers ?? [], 'user_id');

  const { data: openRound } = await supabase
    .from('recognition_rounds')
    .select('id, round_label')
    .eq('tenant_id', tenant.id)
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();

  const roundId = searchParams.round && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchParams.round)
    ? searchParams.round
    : (openRound?.id as string | undefined);

  if (!roundId) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-6 space-y-2">
          <h1 className="text-xl font-semibold text-accent">Nominate a Teacher</h1>
          <p className="text-sm text-ink-300">
            There is no active recognition round for {tenant.name} right now. Nominations open when the
            school admin starts a new cycle.
          </p>
        </div>
      </div>
    );
  }

  const teacherOptions = teachersWithAuthors.map((t: any) => {
    const name = t.profiles?.real_name ? `${t.profiles.real_name} — ${t.subject_taught}` : t.subject_taught;
    return { id: t.id as string, label: name };
  });

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-accent">Nominate a Teacher</h1>
        <p className="text-xs text-ink-300 mt-1">
          Share why your teacher deserves recognition in {tenant.name}&apos;s current cycle
          {openRound?.round_label ? ` (${openRound.round_label})` : ''}.
        </p>
      </div>

      <NominateForm slug={params.slug} roundId={roundId} teachers={teacherOptions} />
    </div>
  );
}