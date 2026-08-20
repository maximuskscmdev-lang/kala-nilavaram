/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/study/upload/page.tsx
 * PURPOSE: Student study material upload form. Accepts academic notes (markdown),
 *          direct document/image URLs, and web links categorized by grade and board.
 *          Surfaces validation and upload errors inline instead of the Next.js
 *          error page.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - UploadStudyForm (Client Component): Form capturing grade (10-12), board
 *   (state_board, cbse, icse, other), subject, topic, item_type (note, pdf, image, link),
 *   title, and content payload, with inline error display.
 * 
 * RELATION TO APP:
 * - Contribution intake for Section 4B (student study-content hub).
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { uploadStudyItem } from '../actions';

export default function UploadStudyItemPage() {
  const params = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/school/${params.slug}/study`} className="text-xs text-brand-light hover:underline">
            ← Back to Study Hub
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-100">Upload Study Material</h1>
        <p className="text-xs text-ink-300 mt-1">
          Share your revision notes, question banks, or reference guides with classmates.
        </p>
      </div>

      <form
        action={async (formData) => {
          setBusy(true);
          setError(null);
          formData.set('tenantSlug', params.slug);
          try {
            await uploadStudyItem(formData);
          } catch (err: any) {
            setError(err.message);
            setBusy(false);
          }
        }}
        encType="multipart/form-data"
        className="card space-y-4"
      >
        <input type="hidden" name="tenantSlug" value={params.slug} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-300">Grade</label>
            <select
              name="grade"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-brand focus:outline-none"
            >
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-300">Educational Board</label>
            <select
              name="board"
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-brand focus:outline-none"
            >
              <option value="state_board">Tamil Nadu State Board</option>
              <option value="cbse">CBSE</option>
              <option value="icse">ICSE / ISC</option>
              <option value="other">Other / General</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Subject</label>
          <input
            name="subject"
            required
            placeholder="e.g. Mathematics, Physics, Tamil"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Topic / Chapter (optional)</label>
          <input
            name="topic"
            placeholder="e.g. Thermodynamics, Coordinate Geometry"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Resource Type</label>
          <select
            name="itemType"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-brand focus:outline-none"
          >
            <option value="note">Study Note (Written text / Markdown)</option>
            <option value="pdf">PDF Document URL</option>
            <option value="image">Diagram / Mindmap Image URL</option>
            <option value="link">External Resource Link</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Resource Title</label>
          <input
            name="title"
            required
            minLength={3}
            placeholder="e.g. Quick Formula Sheet - Unit 3"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Note Content (for &quot;Note&quot; type)</label>
          <textarea
            name="body"
            rows={5}
            placeholder="Type or paste your summary notes and formulas here..."
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">
            Upload File (for PDF or Image resources)
          </label>
          <input
            name="file"
            type="file"
            accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 file:mr-3 file:rounded-md file:border-0 file:bg-brand/20 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-light hover:file:bg-brand/30 focus:border-brand focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-ink-500">
            Stored in the secure study-files bucket (max 10 MB). Or paste an external URL below instead.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">File URL (alternative to upload)</label>
          <input
            name="fileUrl"
            type="url"
            placeholder="https://... (Supabase Storage public URL or cloud link)"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-300">Web Link URL (for &quot;Link&quot; type)</label>
          <input
            name="linkUrl"
            type="url"
            placeholder="https://... (YouTube video, interactive simulator, quiz)"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button disabled={busy} className="btn-primary w-full shadow-md font-semibold text-sm py-2.5" type="submit">
          {busy ? 'Publishing…' : 'Publish to Study Hub'}
        </button>
      </form>
    </div>
  );
}