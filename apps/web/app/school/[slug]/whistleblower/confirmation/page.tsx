/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/whistleblower/confirmation/page.tsx
 * PURPOSE: Confirmation receipt screen displayed immediately following successful
 *          whistleblower complaint submission. Shows the unique tracking ID.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - ConfirmationPage (React Server Component): Renders the generated tracking ID,
 *   stage progression lifecycle, and guidance on saving the ID for status lookups.
 * 
 * RELATION TO APP:
 * - Critical user feedback screen guaranteeing submitters have their persistent reference.
 * ============================================================================
 */

import Link from 'next/link';

export default function ConfirmationPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { id?: string };
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-xl2 border border-safe/40 bg-safe/10 p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-safe/20 flex items-center justify-center text-2xl">
          ✓
        </div>

        <div>
          <h1 className="text-xl font-bold text-safe">Report Received Securely</h1>
          <p className="text-xs text-ink-300 mt-1 max-w-sm mx-auto">
            A trusted moderator will review your submission and reach out via phone to verify details.
            Please store this confidential tracking code safely.
          </p>
        </div>

        <div className="rounded-xl bg-ink-950 border border-safe/30 p-4">
          <span className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold block mb-1">
            Your Tracking ID
          </span>
          <p className="font-mono text-2xl font-bold tracking-widest text-safe select-all">
            {searchParams.id ?? 'KN-2026-PENDING'}
          </p>
        </div>

        <div className="space-y-1 text-xs text-ink-400 border-t border-safe/20 pt-4">
          <p className="font-semibold text-ink-300">Resolution Process:</p>
          <p className="text-[11px]">
            Received → Under Review → Verified/Contacted → Action Taken / Escalated / Closed
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link
            href={`/school/${params.slug}/whistleblower/track`}
            className="btn-safe text-xs"
          >
            Check Status Portal →
          </Link>
          <Link
            href={`/school/${params.slug}/feed`}
            className="rounded-full border border-ink-700 bg-ink-900 px-4 py-2 text-xs font-semibold text-ink-300 hover:bg-ink-800 transition"
          >
            Return to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
