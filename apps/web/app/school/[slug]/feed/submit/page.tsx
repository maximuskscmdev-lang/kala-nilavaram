/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/feed/submit/page.tsx
 * PURPOSE: Student post submission form supporting campus news, opinion, sports,
 *          and event write-ups with flexible byline modes (Real name, Pen name, Anonymous).
 * 
 * IDENTIFIERS & SYMBOLS:
 * - CATEGORIES (string[]): News categories available for student submissions.
 * - SubmitPostPage (Client Component): Form capturing title, body (markdown), category,
 *   type, tags, and interactive byline mode selector.
 * 
 * RELATION TO APP:
 * - Front-end intake for Section 4A student journalism.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { submitPost } from './actions';

const CATEGORIES = ['Academics', 'School Events', 'Sports', 'Announcements', 'Opinion', 'Teacher Corner'];

export default function SubmitPostPage() {
  const params = useParams<{ slug: string }>();
  const [displayMode, setDisplayMode] = useState<'real' | 'pen_name' | 'anonymous'>('real');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/school/${params.slug}/feed`} className="text-xs text-brand-light hover:underline">
            ← Back to Feed
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-100">Submit an Article or News Report</h1>
        <p className="text-xs text-ink-300 mt-1">
          Every submission goes to your student editorial board for review before appearing on the feed.
        </p>
      </div>

      <form
        action={async (formData) => {
          setPending(true);
          setError(null);
          formData.set('tenantSlug', params.slug);
          try {
            await submitPost(formData);
          } catch (err: any) {
            setError(err.message);
            setPending(false);
          }
        }}
        className="card space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-300">Format</label>
            <select
              name="type"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-brand focus:outline-none"
              defaultValue="news_campus"
            >
              <option value="news_campus">Campus News / Story</option>
              <option value="event">School Event Report</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-300">Category</label>
            <select
              name="category"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-brand focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Headline</label>
          <input
            name="title"
            required
            minLength={4}
            maxLength={200}
            placeholder="e.g. Science Fair Highlights 2026: Outstanding Innovations"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Article Content</label>
          <textarea
            name="body"
            required
            minLength={20}
            rows={10}
            placeholder="Write your article body here. Plain text — line breaks are preserved."
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Topic Tags (comma-separated)</label>
          <input
            name="tags"
            placeholder="science, annual-day, sports-day"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-950/80 p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-ink-200">How should your byline appear?</label>
            <p className="text-[11px] text-ink-500">Your real student identity is verified internally by editors.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['real', 'pen_name', 'anonymous'] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setDisplayMode(m)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                  displayMode === m
                    ? 'bg-brand text-white font-semibold shadow-sm'
                    : 'border border-ink-700 text-ink-300 hover:bg-ink-900'
                }`}
              >
                {m === 'real' ? 'Real Name' : m === 'pen_name' ? 'Pen Name' : 'Anonymous Byline'}
              </button>
            ))}
          </div>

          <input type="hidden" name="displayMode" value={displayMode} />

          {displayMode === 'pen_name' && (
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1">
                Claimed Pen Name (unique to this school chapter)
              </label>
              <input
                name="penName"
                placeholder="e.g. CampusChronicleLead"
                required
                maxLength={40}
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          disabled={pending}
          type="submit"
          className="btn-primary w-full shadow-md font-semibold text-sm py-2.5"
        >
          {pending ? 'Submitting for Editorial Review…' : 'Submit for Editorial Review'}
        </button>
      </form>
    </div>
  );
}
