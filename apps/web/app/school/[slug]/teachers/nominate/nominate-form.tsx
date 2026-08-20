/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/teachers/nominate/nominate-form.tsx
 * PURPOSE: Client-side nomination form with inline error handling.
 * 
 * RELATION TO APP:
 * - Direct intake for Section 4F recognition cycles.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { nominateTeacher } from './actions';

export function NominateForm({
  slug,
  roundId,
  teachers
}: {
  slug: string;
  roundId: string;
  teachers: { id: string; label: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async (formData) => {
        setBusy(true);
        setError(null);
        formData.set('tenantSlug', slug);
        formData.set('roundId', roundId);
        try {
          await nominateTeacher(formData);
        } catch (err: any) {
          setError(err.message);
          setBusy(false);
        }
      }}
      className="card space-y-4"
    >
      <input type="hidden" name="tenantSlug" value={slug} />
      <input type="hidden" name="roundId" value={roundId} />

      <div>
        <label className="mb-1 block text-sm text-ink-300">Teacher</label>
        <select
          name="teacherProfileId"
          required
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-accent focus:outline-none"
        >
          <option value="">Select teacher...</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-300">Subject Taught</label>
        <input
          name="subjectTaught"
          required
          placeholder="e.g. Chemistry, Computer Science"
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-300">Years at School</label>
        <input
          name="yearsAtSchool"
          type="number"
          min={0}
          max={60}
          defaultValue={3}
          required
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-300">Why do they deserve recognition?</label>
        <textarea
          name="statement"
          required
          minLength={30}
          maxLength={2000}
          rows={5}
          placeholder="Describe their teaching style, how they support students, and memorable learning moments (min 30 characters)..."
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-300">Supporting notes or quotes from other students (optional)</label>
        <textarea
          name="supportingNotes"
          maxLength={2000}
          rows={3}
          placeholder="Any extra feedback or group endorsement notes..."
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <button disabled={busy} className="btn-primary w-full bg-accent hover:bg-accent/90 text-ink-950 font-semibold" type="submit">
        {busy ? 'Submitting…' : 'Submit Nomination'}
      </button>
    </form>
  );
}