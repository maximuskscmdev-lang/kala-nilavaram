/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/teachers/how-it-works/page.tsx
 * PURPOSE: Explainer page detailing the published, anti-gaming formula used to select
 *          Best Teacher recognition awardees (60% student reviews, 25% nomination quality,
 *          15% editorial sanity check).
 * 
 * IDENTIFIERS & SYMBOLS:
 * - HowItWorksPage (React Server Component): Renders the published criteria and methodology.
 * 
 * RELATION TO APP:
 * - Transparency documentation for Section 4F.
 * ============================================================================
 */

import Link from 'next/link';

export default function HowItWorksPage({ params }: { params: { slug: string } }) {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/school/${params.slug}/teachers`} className="text-xs text-accent hover:underline">
            ← Back to Teachers Showcase
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-100">How Winners are Chosen</h1>
        <p className="text-xs text-ink-300 mt-1">
          A published, objective methodology applied uniformly across every recognition cycle.
        </p>
      </div>

      <div className="card space-y-4 leading-relaxed text-sm text-ink-200">
        <p>
          Best Teacher recognition operates on an open, transparent formula so that awards reflect genuine
          pedagogical dedication rather than popularity contests or administrative favoritism:
        </p>

        <div className="space-y-3 pt-2">
          <div className="rounded-xl border border-ink-800 bg-ink-950 p-4 space-y-1">
            <span className="font-bold text-accent text-sm">60% — Verified Student Review Scores</span>
            <p className="text-xs text-ink-300">
              Aggregated from verified, moderator-approved student reviews submitted during the round&apos;s evaluation period.
            </p>
          </div>

          <div className="rounded-xl border border-ink-800 bg-ink-950 p-4 space-y-1">
            <span className="font-bold text-brand-light text-sm">25% — Qualitative Nomination Quality</span>
            <p className="text-xs text-ink-300">
              Scored from thoughtful nomination essays and supporting peer statements detailing real classroom impact,
              preventing automated ballot stuffing.
            </p>
          </div>

          <div className="rounded-xl border border-ink-800 bg-ink-950 p-4 space-y-1">
            <span className="font-bold text-teacher text-sm">15% — Editorial Board Verification</span>
            <p className="text-xs text-ink-300">
              Independent sanity review by the student editorial board to confirm integrity and adherence to community guidelines.
            </p>
          </div>
        </div>

        <p className="text-xs text-ink-400 pt-2 border-t border-ink-800">
          The full scoring breakdown for every awardee is published transparently alongside the public announcement article.
        </p>
      </div>
    </article>
  );
}
