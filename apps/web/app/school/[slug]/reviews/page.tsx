/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/reviews/page.tsx
 * PURPOSE: Dual-track school and teacher review showcase. Displays student and
 *          faculty evaluations across teaching, facilities, safety, and administration.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - ReviewsPage (Async React Server Component): Queries published reviews for the
 *   tenant, displays star ratings break-down, comments, and byline mode.
 * 
 * RELATION TO APP:
 * - Direct implementation of Section 4D (dual-track student/teacher school review system).
 * ============================================================================
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ReviewsPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { submitted?: string };
}) {
  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', params.slug)
    .maybeSingle();

  // Unknown slug must 404 — otherwise the query below falls back to returning
  // every tenant's published reviews, breaking tenant isolation (bug #14).
  if (!tenant) notFound();

  let query = supabase
    .from('reviews')
    .select(
      'id, reviewer_role, target_type, target_teacher_name, ratings, body, display_mode, created_at, author_identities:author_identity_id (display_mode, pen_name)'
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(30);

  if (tenant?.id) {
    query = query.eq('tenant_id', tenant.id);
  }

  const { data: reviews } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-100">School & Faculty Reviews</h1>
          <p className="text-xs text-ink-300 mt-0.5">
            Verified, constructive feedback from students and educators at {tenant?.name ?? 'your school'}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/school/${params.slug}/reviews/submit?role=student`}
            className="btn-primary text-xs shadow-sm"
          >
            + Student Review
          </Link>
          <Link
            href={`/school/${params.slug}/reviews/submit?role=teacher`}
            className="rounded-full border border-teacher/50 bg-teacher/10 px-3.5 py-1.5 text-xs font-semibold text-teacher hover:bg-teacher/20 transition"
          >
            + Teacher Track
          </Link>
        </div>
      </div>

      {searchParams.submitted && (
        <div className="rounded-xl2 border border-teacher/40 bg-teacher/10 p-4 text-xs text-teacher space-y-1">
          <p className="font-semibold">✓ Review submitted for verification</p>
          <p className="text-ink-300">
            Thank you. Your review is pending moderator verification before it affects public school scorecards.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(reviews ?? []).map((r: any) => (
          <div key={r.id} className="card space-y-3 hover:border-ink-600 transition">
            <div className="flex items-center justify-between border-b border-ink-800 pb-2">
              <span className={`badge capitalize text-[11px] ${r.reviewer_role === 'teacher' ? 'bg-teacher/15 text-teacher' : 'badge-news'}`}>
                {r.reviewer_role} Evaluation
              </span>
              <span className="text-[11px] text-ink-500">{new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>

            {r.target_teacher_name && (
              <div className="text-xs font-semibold text-accent">
                Faculty Focus: {r.target_teacher_name}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(r.ratings as Record<string, number>).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-ink-950 px-2.5 py-1 border border-ink-800 flex justify-between items-center">
                  <span className="capitalize text-ink-400 text-[11px]">{k.replace('_', ' ')}</span>
                  <span className="text-accent font-semibold tracking-wider">{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span>
                </div>
              ))}
            </div>

            {r.body && (
              <p className="text-xs text-ink-200 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
                {r.body}
              </p>
            )}

            <div className="text-[11px] text-ink-500 pt-1 border-t border-ink-800 flex items-center justify-between">
              <span>Verified {r.reviewer_role === 'student' ? 'Student' : 'Faculty Member'}</span>
              {r.author_identities?.display_mode === 'pen_name' && r.author_identities.pen_name ? (
                <span className="text-ink-300">🖊️ {r.author_identities.pen_name}</span>
              ) : (
                <span>{r.display_mode === 'anonymous' ? '🛡️ Anonymous' : 'Public Byline'}</span>
              )}
            </div>
          </div>
        ))}

        {(!reviews || reviews.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">No published reviews yet</p>
            <p className="text-xs text-ink-400 mt-1">Be the first verified member to share an evaluation of your campus.</p>
          </div>
        )}
      </div>
    </div>
  );
}
