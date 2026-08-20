/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/layout.tsx
 * PURPOSE: Tenant workspace navigation shell for all school-scoped pages
 *          (/school/[slug]/*). Renders sticky header with school chapter identity
 *          and sub-navigation tabs (Feed, Study Hub, Reviews, Teachers, Whistleblower,
 *          Queue for signed-in users; Editorial/Moderation for staff).
 * 
 * IDENTIFIERS & SYMBOLS:
 * - formatSchoolName (Helper): Formats a slug into a readable school name when fallback needed.
 * - SchoolLayout (Async React Server Component): Queries the tenant by slug, resolves
 *   staff roles to show optional 'Editorial' and 'Moderation' links, and renders the layout shell.
 * 
 * RELATION TO APP:
 * - Structural wrapper defining the tenant experience across all feature modules.
 * ============================================================================
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';
import { ENABLE_DEMO_MODE } from '@/lib/config';
import { signOut } from './auth-actions';

function formatSchoolName(slug: string): string {
  if (slug === 'abc-matric-hr-sec') return 'ABC Matriculation Higher Secondary School';
  if (slug === 'demo-school') return 'Demo School (Pilot Chapter)';
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default async function SchoolLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const supabase = createClient();
  let tenant: { name: string; slug: string } | null = null;

  try {
    const { data } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('slug', params.slug)
      .maybeSingle();
    tenant = data;
  } catch {
    tenant = null;
  }

  // Fallback for demo / development
  if (!tenant) {
    if (ENABLE_DEMO_MODE && (params.slug === 'abc-matric-hr-sec' || params.slug === 'demo-school')) {
      tenant = { name: formatSchoolName(params.slug), slug: params.slug };
    } else {
      notFound();
    }
  }

  // Check if current user is moderator or editor for this tenant
  let isStaff = false;
  let canModerateInbox = false;
  let signedIn = false;
  try {
    const { data: auth } = await supabase.auth.getUser();
    signedIn = !!auth.user;
    const isSuper = await isSuperAdmin();
    const membership = await getMembershipForTenant(params.slug);
    isStaff = isSuper || (!!membership && ['editor', 'moderator', 'school_admin'].includes(membership.role));
    canModerateInbox = isSuper || (!!membership && ['moderator', 'school_admin'].includes(membership.role));
  } catch {
    isStaff = false;
  }

  const nav = [
    { href: `/school/${params.slug}/feed`, label: 'Feed' },
    { href: `/school/${params.slug}/study`, label: 'Study Hub' },
    { href: `/school/${params.slug}/reviews`, label: 'Reviews' },
    { href: `/school/${params.slug}/teachers`, label: 'Teachers' },
    { href: `/school/${params.slug}/whistleblower`, label: '🛡️ Raise an issue' }
  ];

  if (signedIn) {
    nav.push({ href: `/school/${params.slug}/queue`, label: 'Queue' });
  }

  if (isStaff) {
    nav.push({ href: `/school/${params.slug}/editorial`, label: 'Editorial Queue' });
    nav.push({ href: `/school/${params.slug}/moderation/reviews`, label: 'Review Moderation' });
    if (canModerateInbox) {
      nav.push({ href: `/school/${params.slug}/moderation/inbox`, label: 'Moderation Inbox' });
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col">
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/90 backdrop-blur-md">
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
          />
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold text-base tracking-tight text-ink-100 group-hover:text-brand-light transition">
              Kala Nilavaram
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-300 font-medium px-2.5 py-0.5 rounded-full bg-ink-900 border border-ink-800">
              {tenant.name}
            </span>
            {signedIn ? (
              <form action={signOut}>
                <button className="text-xs text-ink-400 hover:text-ink-100 transition" type="submit">
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/auth/sign-in"
                className="rounded-full border border-ink-700 px-3 py-1 text-xs font-semibold text-ink-200 hover:border-brand hover:text-brand-light transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

          <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2.5 text-sm text-ink-300 scrollbar-none">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium hover:bg-ink-800 hover:text-ink-100 transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </div>

      <footer className="mt-auto border-t border-ink-800 bg-ink-950/50 py-6 text-center text-xs text-ink-500">
        <p>Kala Nilavaram · Independent & Student-Run Platform</p>
      </footer>
    </div>
  );
}
