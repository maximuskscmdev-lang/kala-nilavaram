/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/whistleblower/track/page.tsx
 * PURPOSE: Public report status tracking page. Allows submitters to query
 *          de-identified complaint status and public moderator notes using their
 *          tracking ID without requiring a login session.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - TrackReportPage (Client Component): Form input for tracking ID (KN-YYYY-XXXXXX),
 *   calling lookupReportStatus server action and rendering the resolution timeline.
 * 
 * RELATION TO APP:
 * - Privacy-preserving status lookup mechanism per Section 5.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { lookupReportStatus } from '../actions';

export default function TrackReportPage({ params }: { params: { slug: string } }) {
  const [trackingId, setTrackingId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('trackingId', trackingId.trim());
      const data = await lookupReportStatus(formData);
      setResult(data);
      if (!data) setError('No report found matching that tracking ID. Please check the spelling.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/school/${params.slug}/whistleblower`} className="text-xs text-safe hover:underline">
            ← Back to Submit Form
          </Link>
        </div>
        <h1 className="text-xl font-bold text-ink-100">Check Report Status</h1>
        <p className="text-xs text-ink-300 mt-1">
          No sign-in required — simply enter your confidential tracking ID below.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="block text-xs font-semibold text-ink-300 mb-1">
            Tracking ID
          </label>
          <div className="flex gap-2">
            <input
              value={trackingId}
              required
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              placeholder="KN-2026-XXXXXX"
              className="flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm font-mono text-ink-100 placeholder-ink-500 focus:border-safe focus:outline-none"
            />
            <button disabled={loading || !trackingId.trim()} className="btn-safe text-xs px-5" type="submit">
              {loading ? 'Checking…' : 'Look Up'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-xl2 border border-danger/40 bg-danger/10 p-4 text-xs text-danger">
          {error}
        </div>
      )}

      {result && (
        <div className="card border-safe/40 bg-safe/5 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-safe/20 pb-2">
            <span className="font-mono text-xs text-safe font-semibold">{result.tracking_id}</span>
            <span className="badge bg-safe/20 text-safe capitalize font-semibold">
              {String(result.status).replace('_', ' ')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-ink-400 block uppercase">Issue Category</span>
            <p className="text-sm font-medium text-ink-100 capitalize">
              {String(result.category).replace('_', ' ')}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-ink-400 block uppercase">Latest Public Note</span>
            <p className="text-xs text-ink-300 mt-0.5 whitespace-pre-wrap">
              {result.latest_public_note || 'Report received and currently assigned for moderator triage.'}
            </p>
          </div>

          <div className="text-[11px] text-ink-500 pt-2 border-t border-ink-800 flex justify-between">
            <span>Submitted: {new Date(result.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            {result.closed_at && <span>Resolved: {new Date(result.closed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
