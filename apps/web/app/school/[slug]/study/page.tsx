/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/study/page.tsx
 * PURPOSE: Student study resources showcase, featuring filters by grade, subject,
 *          and keywords, previewing study notes, links, and PDF/image resources,
 *          plus interactive peer upvoting.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - StudyHubPage (Async React Server Component): Fetches filtered study items,
 *   renders search & filter bar, and displays resource cards with direct access.
 * - upvoteStudyItem (Server Action): Bound action to toggle upvotes per resource.
 * 
 * RELATION TO APP:
 * - Direct implementation of Section 4B (student study-content hub).
 * ============================================================================
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { upvoteStudyItem } from './actions';

export default async function StudyHubPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { grade?: string; subject?: string; q?: string };
}) {
  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', params.slug)
    .maybeSingle();

  let query = supabase
    .from('study_items')
    .select('id, title, grade, subject, topic, item_type, board, body, file_url, link_url, upvote_count, created_at')
    .eq('status', 'published')
    .order('upvote_count', { ascending: false })
    .limit(50);

  if (tenant?.id) {
    query = query.eq('tenant_id', tenant.id);
  }

  if (searchParams.grade) query = query.eq('grade', Number(searchParams.grade));
  if (searchParams.subject) query = query.ilike('subject', `%${searchParams.subject}%`);
  if (searchParams.q) query = query.ilike('title', `%${searchParams.q}%`);

  const { data: items } = await query;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Study Hub</h1>
          <p className="text-xs text-ink-300">Notes, sample questions, and study materials shared by peers.</p>
        </div>
        <Link href={`/school/${params.slug}/study/upload`} className="btn-primary text-xs shadow-sm">
          + Upload Material
        </Link>
      </div>

      {/* Filter Form */}
      <form className="mb-6 flex flex-wrap gap-2 text-xs">
        <select
          name="grade"
          defaultValue={searchParams.grade ?? ''}
          className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-ink-100 focus:border-brand focus:outline-none"
        >
          <option value="">All grades</option>
          <option value="10">Grade 10</option>
          <option value="11">Grade 11</option>
          <option value="12">Grade 12</option>
        </select>

        <input
          name="subject"
          defaultValue={searchParams.subject}
          placeholder="Subject (e.g. Physics, Maths)"
          className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
        />

        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search by topic or title"
          className="flex-1 min-w-[140px] rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
        />

        <button className="rounded-lg bg-ink-800 border border-ink-700 px-4 py-2 font-medium hover:bg-ink-700 text-ink-100 transition">
          Filter
        </button>
      </form>

      {/* Material List */}
      <div className="space-y-3">
        {(items ?? []).map((it: any) => (
          <div key={it.id as string} className="card space-y-3 hover:border-ink-600 transition">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-study uppercase tracking-wider text-[10px]">
                    {it.item_type}
                  </span>
                  <span className="text-xs text-ink-500">
                    Grade {it.grade} · {it.board ? String(it.board).replace('_', ' ') : 'General'}
                  </span>
                </div>
                <h3 className="font-semibold text-base text-ink-100">{it.title}</h3>
                <p className="text-xs text-ink-300">
                  {it.subject} {it.topic ? `· Topic: ${it.topic}` : ''}
                </p>
              </div>

              {/* Upvote button */}
              <form action={upvoteStudyItem.bind(null, params.slug, it.id)}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/20 transition"
                  title="Upvote this resource"
                >
                  <span>▲</span>
                  <span>{it.upvote_count ?? 0}</span>
                </button>
              </form>
            </div>

            {/* Note body or link */}
            {it.body && (
              <div className="rounded-lg bg-ink-950/80 p-3 text-xs text-ink-300 whitespace-pre-wrap border border-ink-800/80 max-h-36 overflow-y-auto">
                {it.body}
              </div>
            )}

            {it.file_url && (
              <div className="pt-1">
                <a
                  href={it.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-light hover:underline font-medium"
                >
                  📄 View / Download Attached Resource →
                </a>
              </div>
            )}

            {it.link_url && (
              <div className="pt-1">
                <a
                  href={it.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-light hover:underline font-medium"
                >
                  🔗 Open External Reference URL →
                </a>
              </div>
            )}
          </div>
        ))}

        {(!items || items.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">No study material found for this filter.</p>
            <p className="text-xs text-ink-300 mt-1">Be the first to contribute notes or references for your classmates.</p>
            <Link
              href={`/school/${params.slug}/study/upload`}
              className="btn-primary mt-4 inline-block text-xs"
            >
              Upload Material
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
