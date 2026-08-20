/**
 * ============================================================================
 * FILE: apps/web/app/schools/new/page.tsx
 * PURPOSE: Self-serve chapter application form for students or teachers wanting
 *          to establish a Kala Nilavaram chapter at their school. Inline error
 *          display instead of the Next.js error page on conflicts.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - NewChapterForm (Client Component): Form capturing School Name, City,
 *   and suggested URL slug with client validation patterns.
 * 
 * RELATION TO APP:
 * - Chapter expansion mechanism per Section 3 (self-serve chapter request flow).
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { requestNewChapter } from './actions';

export default function NewChapterPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto max-w-md px-4 py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-100">Start a Chapter at My School</h1>
        <p className="text-xs text-ink-300 mt-1">
          We&apos;ll review your application and verify you before the chapter goes live.
        </p>
      </div>

      <form
        action={async (formData) => {
          setBusy(true);
          setError(null);
          try {
            await requestNewChapter(formData);
          } catch (err: any) {
            setError(err.message);
            setBusy(false);
          }
        }}
        className="card space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm text-ink-300">School Name</label>
          <input
            name="name"
            required
            minLength={3}
            placeholder="e.g. St. Bede's Anglo Indian Hr Sec School"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-300">City / District</label>
          <input
            name="city"
            required
            defaultValue="Chennai"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink-300">Suggested URL Slug</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            placeholder="st-bedes-chennai"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-ink-500">
            Will be reachable at: kalanilavaram.com/school/<span className="text-brand-light">your-slug</span>
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button disabled={busy} className="btn-primary w-full shadow-md" type="submit">
          {busy ? 'Submitting…' : 'Submit Chapter Request'}
        </button>
      </form>
    </main>
  );
}