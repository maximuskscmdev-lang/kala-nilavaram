/**
 * ============================================================================
 * FILE: apps/web/app/admin/chapters/page.tsx
 * PURPOSE: Platform admin review queue for school chapter requests. Super
 *          admins approve, reject, or suspend chapters submitted through the
 *          self-serve /schools/new flow.
 *
 * IDENTIFIERS & SYMBOLS:
 * - AdminChaptersPage (Async React Server Component): Role-gates to super
 *   admins, lists pending/suspended chapters, and renders approve/reject/
 *   suspend controls.
 *
 * RELATION TO APP:
 * - Back-office counterpart to the self-serve chapter application flow.
 * ============================================================================
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { approveChapter, rejectChapter, suspendChapter } from './actions';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-accent/15 text-accent',
  active: 'bg-teacher/15 text-teacher',
  suspended: 'bg-danger/15 text-danger',
  rejected: 'bg-danger/15 text-danger'
};

export default async function AdminChaptersPage() {
  if (!(await isSuperAdmin())) {
    redirect('/schools');
  }

  const supabase = createClient();
  const { data: chapters } = await supabase
    .from('tenants')
    .select('id, slug, name, city, state, status, requested_by, created_at')
    .in('status', ['pending', 'suspended', 'active'])
    .order('created_at', { ascending: true });

  const requesterIds = [...new Set((chapters ?? []).map((c) => c.requested_by).filter(Boolean))] as string[];
  const { data: requesters } = requesterIds.length
    ? await supabase.from('profiles').select('id, real_name').in('id', requesterIds)
    : { data: null };
  const requesterNames = new Map((requesters ?? []).map((p) => [p.id, p.real_name]));

  const { data: recent } = await supabase
    .from('tenants')
    .select('id, slug, name, city, status')
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">Chapter Review Queue</h1>
          <p className="text-xs text-ink-300 mt-1">
            Platform admin only. Verify a school before activating its chapter.
          </p>
        </div>
        <Link href="/schools" className="text-xs text-brand-light hover:underline">
          ← Back to directory
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300 border-b border-ink-800 pb-2">
          Chapter management
        </h2>

        {(chapters ?? []).map((c) => (
          <div key={c.id as string} className="card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-base text-ink-100">{c.name}</h3>
                <p className="text-xs text-ink-400 mt-0.5">
                  /school/{c.slug} · {c.city}, {c.state}
                </p>
                <p className="text-xs text-ink-500 mt-1">
                  Requested {new Date(c.created_at as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {c.requested_by && requesterNames.has(c.requested_by as string) && (
                    <> by {requesterNames.get(c.requested_by as string)}</>
                  )}
                </p>
              </div>
              <span className={`badge capitalize text-xs ${STATUS_BADGE[c.status as string] ?? ''}`}>
                {c.status}
              </span>
            </div>

            <form action={async () => {}} className="flex flex-wrap gap-2 pt-1">
              {c.status !== 'active' && (
                <button
                  formAction={approveChapter.bind(null, c.id as string)}
                  className="btn-primary text-xs shadow-sm"
                >
                  {c.status === 'suspended' ? '✓ Reactivate Chapter' : '✓ Activate Chapter'}
                </button>
              )}
              {c.status === 'pending' && (
                <button
                  formAction={rejectChapter.bind(null, c.id as string)}
                  className="rounded-full border border-danger/70 bg-danger/10 px-3.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 transition"
                >
                  ✕ Reject Request
                </button>
              )}
              {c.status === 'active' && (
                <button
                  formAction={suspendChapter.bind(null, c.id as string)}
                  className="rounded-full border border-ink-700 bg-ink-800 px-3.5 py-1.5 text-xs font-semibold text-ink-100 hover:bg-ink-700 transition"
                >
                  Suspend
                </button>
              )}
            </form>
          </div>
        ))}

        {(!chapters || chapters.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">No chapters to manage</p>
            <p className="text-xs text-ink-400 mt-1">New requests from /schools/new will appear here.</p>
          </div>
        )}
      </section>

      {recent && recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300 border-b border-ink-800 pb-2">
            Recently rejected
          </h2>
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id as string} className="card flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm text-ink-200 font-medium">{r.name}</p>
                  <p className="text-xs text-ink-500">{r.slug}</p>
                </div>
                <span className="badge bg-danger/15 text-danger text-xs capitalize">{r.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}