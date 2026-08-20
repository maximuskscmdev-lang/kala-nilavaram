/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/admin/recognition/award-form.tsx
 * PURPOSE: Interactive score evaluation form for school admins & editors to input
 *          Review (60%), Nomination (25%), and Editorial (15%) weights, computing
 *          the transparent total and triggering the award grant action.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - AwardForm (Client Component): Displays teacher details, nomination statement,
 *   numeric score inputs with automatic weighted total calculation, and submit button.
 * - ScoreInput (Helper Component): Number input helper bounded between 0 and 100.
 * 
 * RELATION TO APP:
 * - Direct execution of Section 4F (Best Teacher recognition program).
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { awardTeacher } from './actions';

export function AwardForm({
  slug,
  roundId,
  teacherProfileId,
  teacherName,
  subjectTaught,
  statement
}: {
  slug: string;
  roundId: string;
  teacherProfileId: string;
  teacherName: string;
  subjectTaught: string;
  statement: string;
}) {
  const [reviewScore, setReviewScore] = useState(80);
  const [nominationScore, setNominationScore] = useState(70);
  const [editorialScore, setEditorialScore] = useState(90);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Math.round(reviewScore * 0.6 + nominationScore * 0.25 + editorialScore * 0.15);

  return (
    <div className="rounded-xl2 border border-ink-700 bg-ink-950/60 p-4 text-sm space-y-3">
      <div>
        <h4 className="font-semibold text-base text-ink-100">{teacherName || 'Teacher'}</h4>
        <p className="text-xs text-accent font-medium">{subjectTaught}</p>
      </div>

      <div className="rounded-lg bg-ink-900/80 p-3 border border-ink-800">
        <span className="text-[11px] font-semibold uppercase text-ink-500 block mb-1">Nomination Statement:</span>
        <p className="text-xs text-ink-300 line-clamp-3 italic">&quot;{statement}&quot;</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <ScoreInput label="Review (60%)" value={reviewScore} onChange={setReviewScore} />
        <ScoreInput label="Nomination (25%)" value={nominationScore} onChange={setNominationScore} />
        <ScoreInput label="Editorial (15%)" value={editorialScore} onChange={setEditorialScore} />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-ink-800">
        <p className="text-xs font-semibold text-ink-300">
          Computed Score: <span className="text-accent text-sm">{total}</span> / 100
        </p>
        <button
          disabled={busy || done}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await awardTeacher(slug, roundId, teacherProfileId, {
                review_score: reviewScore,
                nomination_score: nominationScore,
                editorial_score: editorialScore,
                total
              });
              setDone(true);
            } catch (err: any) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
          className="btn-primary text-xs bg-accent hover:bg-accent/90 text-ink-950 font-semibold"
        >
          {done ? 'Awarded ✓' : busy ? 'Awarding…' : '🏆 Grant Recognition Award'}
        </button>
      </div>
    </div>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-ink-400 font-medium">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0);
        }}
        className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-ink-100 text-xs focus:border-accent focus:outline-none"
      />
    </label>
  );
}
