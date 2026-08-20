/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/moderation/reviews/review-row.tsx
 * PURPOSE: Interactive moderation card for a single review submission. Lets a
 *          moderator publish a pending review, flag it with a reason (recorded
 *          in review_flags + flag_count), or remove it outright.
 *
 * IDENTIFIERS & SYMBOLS:
 * - Review (Type): Shape of a review awaiting moderation.
 * - ReviewRow (Client Component): Renders ratings breakdown, moderation
 *   controls, and a reason prompt for flagging.
 *
 * RELATION TO APP:
 * - Execution interface for the Section 4D review verification step.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { flagReview, publishReview, removeReview } from './actions';

type Review = {
  id: string;
  reviewer_role: string;
  target_type: string;
  target_teacher_name: string | null;
  ratings: Record<string, number>;
  body: string | null;
  display_mode: string;
  status: string;
  flag_count: number;
  created_at: string;
};

export function ReviewRow({ review, slug }: { review: Review; slug: string }) {
  const [busy, setBusy] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`card space-y-3 ${review.status === 'flagged' ? 'border-danger/50' : ''}`}>
      <div className="flex items-center justify-between border-b border-ink-800 pb-2.5">
        <div>
          <h3 className="font-semibold text-base text-ink-100 capitalize">
            {review.reviewer_role} Evaluation
            {review.target_teacher_name && (
              <span className="text-accent"> · {review.target_teacher_name}</span>
            )}
          </h3>
          <p className="text-xs text-ink-400 mt-0.5">
            Submitted {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ·{' '}
            {review.display_mode === 'anonymous' ? '🛡️ Anonymous' : 'Public Byline'}
            {review.flag_count > 0 && (
              <span className="text-danger ml-2">⚠ flagged ×{review.flag_count}</span>
            )}
          </p>
        </div>
        <span className={`badge capitalize text-[11px] ${review.status === 'flagged' ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent'}`}>
          {review.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {Object.entries(review.ratings ?? {}).map(([k, v]) => (
          <div
            key={k}
            className="rounded-lg bg-ink-950 px-2.5 py-1 border border-ink-800 flex justify-between items-center"
          >
            <span className="capitalize text-ink-400 text-[11px]">{k.replace('_', ' ')}</span>
            <span className="text-accent font-semibold tracking-wider">{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span>
          </div>
        ))}
      </div>

      {review.body && (
        <p className="text-xs text-ink-200 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
          {review.body}
        </p>
      )}

      <div className="rounded-lg bg-ink-950 border border-ink-800/60 p-3 space-y-2">
        <label className="block text-xs font-semibold text-ink-300">
          Reason (required when flagging)
        </label>
        <textarea
          value={flagReason}
          onChange={(e) => setFlagReason(e.target.value)}
          placeholder="e.g. Suspected brigading, unverified reviewer, or policy violation"
          rows={2}
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-xs text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 pt-1">
        <button
          disabled={busy}
          onClick={() => run(() => publishReview(slug, review.id))}
          className="btn-primary text-xs shadow-sm"
        >
          {busy ? 'Processing…' : '✓ Publish Review'}
        </button>

        <button
          disabled={busy || !flagReason.trim()}
          onClick={() => run(() => flagReview(slug, review.id, flagReason))}
          className="rounded-full border border-accent/70 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-40 transition"
        >
          🚩 Flag Review
        </button>

        <button
          disabled={busy}
          onClick={() => run(() => removeReview(slug, review.id))}
          className="rounded-full border border-danger/70 bg-danger/10 px-4 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-40 transition"
        >
          Remove Review
        </button>
      </div>
    </div>
  );
}