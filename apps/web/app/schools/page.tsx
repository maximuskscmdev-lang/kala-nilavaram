/**
 * ============================================================================
 * FILE: apps/web/app/schools/page.tsx
 * PURPOSE: Directory page for browsing all active and pending school chapters,
 *          with direct links into tenant workspaces and a button to request a new chapter.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - DEMO_TENANTS (Constant): Fallback school chapters for local development.
 * - SchoolsPage (Async React Server Component): Fetches all registered tenant rows,
 *   displays status badges ('active', 'pending', 'suspended'), and renders the directory list.
 * 
 * RELATION TO APP:
 * - Public multi-tenant school switcher and chapter discovery catalog.
 * ============================================================================
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { DEMO_TENANTS, ENABLE_DEMO_MODE } from '@/lib/config';

export default async function SchoolsPage({
  searchParams
}: {
  searchParams?: { requested?: string };
}) {
  const supabase = createClient();
  let tenants: any[] | null = null;

  try {
    const { data } = await supabase
      .from('tenants')
      .select('slug, name, city, status')
      .order('name');
    tenants = data;
  } catch {
    tenants = null;
  }

  const isSuper = await isSuperAdmin();
  const pendingCount = (tenants ?? []).filter((t) => t.status === 'pending').length;
  const allSchools = tenants && tenants.length > 0 ? tenants : (ENABLE_DEMO_MODE ? DEMO_TENANTS : []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">School Chapters</h1>
          <p className="text-xs text-ink-300 mt-1">Browse active chapters or request one for your school.</p>
        </div>
        <Link href="/schools/new" className="btn-primary text-xs shadow-sm">
          + Start a Chapter
        </Link>
      </div>

      {searchParams?.requested && (
        <div className="rounded-xl2 border border-brand/40 bg-brand/10 p-4 text-sm text-brand-light">
          ✓ Chapter request submitted successfully. Our student team will contact and verify your school before activating.
        </div>
      )}

      {isSuper && (
        <Link
          href="/admin/chapters"
          className="rounded-xl2 border border-accent/40 bg-accent/10 p-4 text-sm text-accent hover:bg-accent/20 transition flex items-center justify-between"
        >
          <span className="font-semibold">⚙️ Platform Admin — Review chapter requests</span>
          <span className="badge bg-accent/20 text-accent text-xs">{pendingCount} pending</span>
        </Link>
      )}

      <div className="space-y-3">
        {allSchools.map((t: any) => (
          <div
            key={t.slug}
            className="card flex items-center justify-between hover:border-ink-600 transition"
          >
            <div>
              {t.status === 'active' ? (
                <Link
                  href={`/school/${t.slug}/feed`}
                  className="font-semibold text-base text-ink-100 hover:text-brand-light transition"
                >
                  {t.name}
                </Link>
              ) : (
                <p className="font-semibold text-base text-ink-300">{t.name}</p>
              )}
              <p className="text-xs text-ink-500 mt-0.5">{t.city}</p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`badge capitalize text-xs ${
                  t.status === 'active'
                    ? 'bg-teacher/15 text-teacher'
                    : 'bg-accent/15 text-accent'
                }`}
              >
                {t.status}
              </span>
              {t.status === 'active' && (
                <Link
                  href={`/school/${t.slug}/feed`}
                  className="rounded-full border border-ink-700 bg-ink-800 px-3 py-1 text-xs text-ink-100 hover:bg-ink-700 transition"
                >
                  Enter →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
