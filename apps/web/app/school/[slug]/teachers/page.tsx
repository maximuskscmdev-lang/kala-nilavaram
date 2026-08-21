/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/teachers/page.tsx
 * PURPOSE: Best Teacher Recognition showcase page. Displays current awarded
 *          faculty members, active recognition nomination rounds, and explains
 *          the transparent scoring criteria.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - TeachersPage (Async React Server Component): Fetches awarded teacher profiles
 *   with user real names and any active recognition round for the tenant.
 * 
 * RELATION TO APP:
 * - Public hub for Section 4F (Best Teacher recognition program).
 * ============================================================================
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { attachProfileRealNames } from '@/lib/supabase/profiles';

export default async function TeachersPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { nominated?: string };
}) {
  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', params.slug)
    .maybeSingle();

  // Unknown slug must 404 to preserve tenant isolation of the public showcase
  // (bug #14).
  if (!tenant) notFound();

  let awardedQuery = supabase
    .from('teacher_profiles')
    .select(`
      id, user_id, subject_taught, bio, badge_status, years_at_school
    `)
    .eq('badge_status', 'awarded');

  let roundQuery = supabase
    .from('recognition_rounds')
    .select('id, round_label, period_start, period_end')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1);

  if (tenant?.id) {
    awardedQuery = awardedQuery.eq('tenant_id', tenant.id);
    roundQuery = roundQuery.eq('tenant_id', tenant.id);
  }

  const { data: awarded } = await awardedQuery;
  const awardedWithAuthors = await attachProfileRealNames(supabase, awarded ?? [], 'user_id');
  const { data: openRounds } = await roundQuery;
  const openRound = openRounds?.[0] ?? null;

  return (
    <div className="space-y-6">
      {searchParams?.nominated && (
        <div className="rounded-xl2 border border-accent/40 bg-accent/10 p-4 text-xs text-accent space-y-1">
          <p className="font-semibold">✓ Nomination submitted</p>
          <p className="text-ink-300">
            Thank you for recognizing an outstanding educator. Nominations are scored after the round closes.
          </p>
        </div>
      )}

      {/* Banner */}
      <div className="rounded-xl2 border border-accent/40 bg-accent/10 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <h1 className="text-xl font-bold text-accent">Best Teacher Recognition</h1>
        </div>
        <p className="text-xs text-ink-300 leading-relaxed max-w-xl">
          An objective, transparent recognition program blending student reviews (60%), nomination quality (25%),
          and editorial verification (15%). No arbitrary popularity contests.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          {openRound ? (
            <Link
              href={`/school/${params.slug}/teachers/nominate?round=${openRound.id}`}
              className="btn-primary text-xs bg-accent hover:bg-accent/90 text-ink-950 font-bold px-4 py-2"
            >
              + Nominate a Teacher ({openRound.round_label})
            </Link>
          ) : (
            <Link
              href={`/school/${params.slug}/teachers/nominate`}
              className="btn-primary text-xs bg-accent hover:bg-accent/90 text-ink-950 font-bold px-4 py-2"
            >
              + Nominate a Teacher
            </Link>
          )}
          <Link
            href={`/school/${params.slug}/teachers/how-it-works`}
            className="text-xs text-accent hover:underline font-medium"
          >
            How winners are scored →
          </Link>
        </div>
      </div>

      {/* Recognized Faculty Showcase */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300 border-b border-ink-800 pb-2">
          Recognized Educators
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {awardedWithAuthors.map((t: any) => {
            const name = t.profiles?.real_name ?? 'Faculty Member';
            return (
              <div key={t.id} className="card space-y-2.5 hover:border-accent/40 transition">
                <div className="flex items-center justify-between">
                  <span className="badge bg-accent/20 text-accent font-semibold text-xs">
                    🏆 Recognized Educator
                  </span>
                  {t.years_at_school && (
                    <span className="text-[11px] text-ink-500">{t.years_at_school} yrs teaching</span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-base text-ink-100">{name}</h3>
                  <p className="text-xs text-accent font-medium">{t.subject_taught}</p>
                </div>

                {t.bio && <p className="text-xs text-ink-300 line-clamp-3 leading-relaxed">{t.bio}</p>}
              </div>
            );
          })}

          {(!awardedWithAuthors || awardedWithAuthors.length === 0) && (
            <div className="card text-center py-10 col-span-2">
              <p className="text-sm font-medium text-ink-100">No teachers recognized yet this cycle</p>
              <p className="text-xs text-ink-400 mt-1">
                Submit a student nomination to celebrate exceptional teaching in your classrooms.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
