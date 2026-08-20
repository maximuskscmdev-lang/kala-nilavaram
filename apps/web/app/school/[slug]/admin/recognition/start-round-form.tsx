/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/admin/recognition/start-round-form.tsx
 * PURPOSE: Client form to open a new recognition round with inline errors.
 * 
 * RELATION TO APP:
 * - Back-office execution of Section 4F recognition program.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { startRecognitionRound } from './actions';

export function StartRoundForm({ slug, today }: { slug: string; today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async (formData) => {
        setBusy(true);
        setError(null);
        formData.set('tenantSlug', slug);
        try {
          await startRecognitionRound(formData);
        } catch (err: any) {
          setError(err.message);
          setBusy(false);
        }
      }}
      className="card space-y-3"
    >
      <h3 className="text-sm font-semibold text-ink-100">Start a new recognition round</h3>
      <input type="hidden" name="tenantSlug" value={slug} />
      <div className="grid sm:grid-cols-3 gap-2">
        <input
          name="roundLabel"
          required
          minLength={3}
          maxLength={80}
          placeholder="Round label, e.g. Jul-Aug 2026"
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100"
        />
        <input
          name="periodStart"
          type="date"
          required
          defaultValue={today}
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100"
        />
        <input
          name="periodEnd"
          type="date"
          required
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <button
        disabled={busy}
        className="btn-primary text-xs bg-accent hover:bg-accent/90 text-ink-950 font-semibold"
        type="submit"
      >
        {busy ? 'Opening…' : '+ Open Round'}
      </button>
    </form>
  );
}