/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/admin/recognition/page.tsx
 * PURPOSE: Admin dashboard for evaluating active/past teacher recognition rounds,
 *          reviewing student nominations, and scoring candidate teachers.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - AdminRecognitionPage (Async React Server Component): Verifies 'editor' or
 *   'school_admin' membership role, fetches rounds and nominations with teacher profiles,
 *   and renders the award evaluation list.
 * 
 * RELATION TO APP:
 * - Direct back-office interface for Section 4F (Best Teacher recognition program).
 * ============================================================================
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';
import { attachProfileRealNames } from '@/lib/supabase/profiles';
import { AwardForm } from './award-form';
import { StartRoundForm } from './start-round-form';

export default async function AdminRecognitionPage({ params }: { params: { slug: string } }) {
  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(params.slug);

  if (!isSuper && (!membership || !['editor', 'school_admin'].includes(membership.role))) {
    redirect(`/school/${params.slug}/feed`);
  }

  const supabase = createClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle();

  let roundsQuery = supabase
    .from('recognition_rounds')
    .select('id, round_label, status, period_start, period_end')
    .order('created_at', { ascending: false });

  // Always scope to the school in the URL — including for super admins who have
  // no membership row of their own (previously they saw every school's rounds).
  if (tenant?.id) {
    roundsQuery = roundsQuery.eq('tenant_id', tenant.id);
  }

  const { data: rounds } = await roundsQuery;

  const roundIds = (rounds ?? []).map((r: any) => r.id);
  const { data: nominations } = await supabase
    .from('teacher_nominations')
    .select(`
      id, teacher_profile_id, statement, round_id,
      teacher_profiles (
        id, user_id, subject_taught
      )
    `)
    .in('round_id', roundIds.length > 0 ? roundIds : ['00000000-0000-0000-0000-000000000000']);

  // profiles can't be embedded via user_id (no direct FK to profiles), so
  // resolve teacher real names in a separate RLS-gated query.
  const teacherUserIds = Array.from(
    new Set((nominations ?? []).map((n: any) => n.teacher_profiles?.user_id).filter(Boolean))
  );
  const { data: teacherProfiles } = teacherUserIds.length
    ? await supabase.from('profiles').select('id, real_name').in('id', teacherUserIds)
    : { data: [] };

  const realNameById = new Map((teacherProfiles ?? []).map((p: any) => [p.id, p.real_name]));
  const nominationsWithTeachers = (nominations ?? []).map((n: any) => ({
    ...n,
    teacher_profiles: n.teacher_profiles
      ? { ...n.teacher_profiles, profiles: { real_name: realNameById.get(n.teacher_profiles.user_id) ?? null } }
      : null
  }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-accent">Recognition Rounds — Admin</h1>
        <p className="text-xs text-ink-300 mt-1">
          Review peer nominations and input weighted scores to calculate final awardees.
        </p>
      </div>

      <StartRoundForm slug={params.slug} today={today} />

      <div className="space-y-4">
        {(rounds ?? []).map((r: any) => {
          const roundNominations = nominationsWithTeachers.filter((n: any) => n.round_id === r.id);

          return (
            <div key={r.id} className="card space-y-4">
              <div className="flex items-center justify-between border-b border-ink-800 pb-3">
                <div>
                  <h3 className="font-semibold text-base text-ink-100">{r.round_label}</h3>
                  <p className="text-xs text-ink-500">
                    Period: {r.period_start} to {r.period_end} · {roundNominations.length} nomination(s)
                  </p>
                </div>
                <span className="badge badge-accent capitalize">{r.status}</span>
              </div>

              <div className="space-y-3">
                {roundNominations.map((n: any) => {
                  const teacherProfile = n.teacher_profiles;
                  const teacherName = teacherProfile?.profiles?.real_name ?? 'Verified Faculty';
                  const subjectTaught = teacherProfile?.subject_taught ?? 'Faculty';

                  return (
                    <AwardForm
                      key={n.id}
                      slug={params.slug}
                      roundId={r.id}
                      teacherProfileId={n.teacher_profile_id}
                      teacherName={teacherName}
                      subjectTaught={subjectTaught}
                      statement={n.statement}
                    />
                  );
                })}

                {roundNominations.length === 0 && (
                  <p className="text-xs text-ink-500 py-3 text-center">
                    No nominations submitted for this round yet.
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {(!rounds || rounds.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm text-ink-300">No recognition rounds configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
