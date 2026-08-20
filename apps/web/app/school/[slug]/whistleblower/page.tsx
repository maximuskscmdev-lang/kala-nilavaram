/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/whistleblower/page.tsx
 * PURPOSE: Confidential whistleblower and grievance reporting intake form for
 *          students and staff. Designed with calming aesthetics (Section 7),
 *          capturing issue category, detailed description, and encrypted contact
 *          info, with inline error display instead of the Next.js error page.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - WhistleblowerForm (Client Component): Intake form with reassurance copy,
 *   link to tracking portal, category selector, and encrypted contact inputs.
 * 
 * RELATION TO APP:
 * - Primary intake point for Section 5 (whistleblower shielding).
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { submitWhistleblowerReport } from './actions';

export default function WhistleblowerPage() {
  const params = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-xl2 border border-safe/40 bg-safe/10 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <h1 className="text-xl font-bold text-safe">Raise an Issue, Safely</h1>
        </div>
        <p className="text-xs text-ink-300 leading-relaxed">
          Your identity and contact details are encrypted at rest and accessible only to a small,
          designated moderation team — never shown to other students, teachers, or your school administration.
          You will receive a confidential tracking ID to check progress without needing to log back in.
        </p>
        <div className="pt-1">
          <Link
            href={`/school/${params.slug}/whistleblower/track`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-safe hover:underline"
          >
            Already submitted? Check status with tracking ID →
          </Link>
        </div>
      </div>

      <form
        action={async (formData) => {
          setBusy(true);
          setError(null);
          formData.set('tenantSlug', params.slug);
          try {
            await submitWhistleblowerReport(formData);
          } catch (err: any) {
            setError(err.message);
            setBusy(false);
          }
        }}
        className="card space-y-4"
      >
        <input type="hidden" name="tenantSlug" value={params.slug} />

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-300">Category of Concern</label>
          <select
            name="category"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-safe focus:outline-none"
          >
            <option value="harassment">Harassment / Bullying</option>
            <option value="safety">Physical / Campus Safety Risk</option>
            <option value="facilities">Sanitation & Facilities Issues</option>
            <option value="discrimination">Discrimination or Unfair Treatment</option>
            <option value="financial_administrative">Financial / Administrative Mismanagement</option>
            <option value="other">Other School Concern</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-300">What Happened?</label>
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={8000}
            rows={8}
            placeholder="Please detail what occurred, dates, locations, and any individuals involved (min 20 characters)..."
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-safe focus:outline-none"
          />
        </div>

        <div className="rounded-xl2 border border-safe/30 bg-safe/5 p-4 space-y-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-safe block">
              Confidential Contact Verification
            </span>
            <p className="text-[11px] text-ink-400 mt-0.5">
              Contact information below is encrypted with AES-256 and used exclusively by moderators to follow up.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-300">Your Full Name</label>
            <input
              name="realName"
              required
              placeholder="Full name as registered"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-safe focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-300">Phone Number (for verification call)</label>
            <input
              name="phone"
              required
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-safe focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-300">Email Address (optional)</label>
            <input
              name="email"
              type="email"
              placeholder="name@example.com"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-safe focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button disabled={busy} className="btn-safe w-full shadow-md font-semibold text-sm py-2.5" type="submit">
          {busy ? 'Encrypting & Submitting…' : '🔒 Submit Encrypted Report'}
        </button>
      </form>
    </div>
  );
}