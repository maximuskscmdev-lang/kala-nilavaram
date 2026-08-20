/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/reviews/submit/page.tsx
 * PURPOSE: Review submission form for both student track and teacher track.
 *          Enforces Section 4D policy (teachers never review named colleagues)
 *          and surfaces validation/rate-limit errors inline instead of the
 *          Next.js error page.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - STAR_FIELDS_STUDENT (string[]): ['teaching', 'facilities', 'environment', 'safety', 'extracurriculars'].
 * - STAR_FIELDS_TEACHER (tuple[]): Administration, management, facilities, working environment.
 * - SubmitReviewForm (Client Component): Handles both tracks with inline errors.
 * - StarField (Helper Component): 1-5 star dropdown selector.
 * 
 * RELATION TO APP:
 * - Intake interface for Section 4D dual-track reviews.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { submitStudentReview, submitTeacherReview } from '../actions';
import { BylineSelect } from './byline-select';

const STAR_FIELDS_STUDENT = ['teaching', 'facilities', 'environment', 'safety', 'extracurriculars'];
const STAR_FIELDS_TEACHER = [
  ['administration', 'School Administration'],
  ['management', 'Management & Leadership'],
  ['facilities', 'Workplace & Teaching Facilities'],
  ['workingEnvironment', 'Working Environment & Staff Culture']
];

export default function SubmitReviewPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') === 'teacher' ? 'teacher' : 'student';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/school/${params.slug}/reviews`} className="text-xs text-brand-light hover:underline">
            ← Back to Reviews
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-100">
          {role === 'student' ? 'Student School Review' : 'Teacher Workplace Review'}
        </h1>
        <p className="text-xs text-ink-300 mt-1">
          {role === 'student'
            ? 'Rate teaching quality (overall or for a specific teacher), plus facilities, safety, and extracurriculars.'
            : 'Scoped to institutional administration and working environment — teachers do not review individual colleagues.'}
        </p>
      </div>

      <form
        action={async (formData) => {
          setBusy(true);
          setError(null);
          formData.set('tenantSlug', params.slug);
          try {
            await (role === 'student' ? submitStudentReview : submitTeacherReview)(formData);
          } catch (err: any) {
            setError(err.message);
            setBusy(false);
          }
        }}
        className="card space-y-4"
      >
        <input type="hidden" name="tenantSlug" value={params.slug} />

        {role === 'student' && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-300">
              Teacher Name (Optional — leave blank for general school evaluation)
            </label>
            <input
              name="targetTeacherName"
              placeholder="e.g. Mrs. Lakshmi (Physics)"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-3 pt-2">
          {role === 'student'
            ? STAR_FIELDS_STUDENT.map((f) => <StarField key={f} name={f} label={f} />)
            : STAR_FIELDS_TEACHER.map(([name, label]) => <StarField key={name} name={name} label={label} />)}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Written Comments (Optional)</label>
          <textarea
            name="body"
            rows={4}
            maxLength={4000}
            placeholder="Provide constructive context for your rating..."
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <BylineSelect role={role} />

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button disabled={busy} className="btn-primary w-full shadow-md font-semibold text-sm py-2.5" type="submit">
          {busy ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

function StarField({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs font-medium capitalize text-ink-300">{label.replace('_', ' ')}</label>
      <select
        name={name}
        defaultValue="4"
        className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-1.5 text-xs text-accent font-semibold focus:border-brand focus:outline-none"
      >
        <option value="5">★★★★★ (5/5 Excellent)</option>
        <option value="4">★★★★☆ (4/5 Good)</option>
        <option value="3">★★★☆☆ (3/5 Average)</option>
        <option value="2">★★☆☆☆ (2/5 Needs Work)</option>
        <option value="1">★☆☆☆☆ (1/5 Poor)</option>
      </select>
    </div>
  );
}