/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/feed/submit/thanks/page.tsx
 * PURPOSE: Submission receipt page confirming that an article or event report has
 *          been placed into the editorial board queue.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - SubmitThanksPage (React Server Component): Renders status acknowledgement
 *   and return navigation links.
 * 
 * RELATION TO APP:
 * - Direct confirmation screen for Section 4A student journalism.
 * ============================================================================
 */

import Link from 'next/link';

export default function SubmitThanksPage({ params }: { params: { slug: string } }) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-xl2 border border-brand/40 bg-brand/10 p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center text-2xl">
          ✍️
        </div>

        <div>
          <h1 className="text-xl font-bold text-ink-100">Submitted for Editorial Review</h1>
          <p className="text-xs text-ink-300 mt-1 max-w-sm mx-auto">
            Your school chapter&apos;s editorial team will review this submission. If approved, it will be published to the live campus feed.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link href={`/school/${params.slug}/feed`} className="btn-primary text-xs">
            Return to Campus Feed →
          </Link>
          <Link
            href={`/school/${params.slug}/feed/submit`}
            className="rounded-full border border-ink-700 bg-ink-900 px-4 py-2 text-xs font-semibold text-ink-300 hover:bg-ink-800 transition"
          >
            Submit Another
          </Link>
        </div>
      </div>
    </div>
  );
}
