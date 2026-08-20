/**
 * ============================================================================
 * FILE: apps/web/app/page.tsx
 * PURPOSE: Marketing landing page and active chapter portal for Kala Nilavaram.
 *          Introduces the student-run platform mission, highlights core pillars
 *          (news, study hub, whistleblower, teacher recognition), and lists
 *          active school chapters.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - DEMO_TENANTS (Constant): Fallback school chapters for local development and demonstration.
 * - FEATURE_HIGHLIGHTS (Constant): Core platform value propositions with icon badges.
 * - HomePage (Async React Server Component): Queries active school chapters with
 *   graceful error fallback and renders the hero experience.
 * 
 * RELATION TO APP:
 * - Public gateway for students, teachers, and school communities entering the platform.
 * ============================================================================
 */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DEMO_TENANTS, ENABLE_DEMO_MODE } from '@/lib/config';

const FEATURE_HIGHLIGHTS = [
  {
    icon: '📰',
    title: 'Campus & State News',
    desc: 'Student-led editorial journalism alongside verified state education feeds.'
  },
  {
    icon: '🛡️',
    title: 'Confidential Issue Inbox',
    desc: 'Cryptographically shielded reporting with audited identity reveal protocols.'
  },
  {
    icon: '📚',
    title: 'Peer Study Hub',
    desc: 'Grade 10–12 study notes, question papers, and shared academic resources.'
  },
  {
    icon: '🏆',
    title: 'Best Teacher Recognition',
    desc: 'Transparent formula honoring outstanding educators with student reviews.'
  }
];

export default async function HomePage() {
  const supabase = createClient();
  let tenants: any[] | null = null;

  try {
    const { data } = await supabase
      .from('tenants')
      .select('slug, name, city, state')
      .eq('status', 'active')
      .order('name');
    tenants = data;
  } catch {
    tenants = null;
  }

  const activeChapters = tenants && tenants.length > 0 ? tenants : (ENABLE_DEMO_MODE ? DEMO_TENANTS : []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-20 space-y-16">
      {/* Hero Section */}
      <section className="relative space-y-6 overflow-hidden">
        {/* Decorative floating shapes (subtle, behind content) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <svg
            className="animate-float absolute -top-10 right-4 h-40 w-40 text-brand/10"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="50" cy="50" r="50" />
          </svg>
          <svg
            className="animate-float-slow absolute top-24 -left-8 h-32 w-32 text-safe/10"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <path d="M50 0 L100 100 L0 100 Z" />
          </svg>
          <svg
            className="animate-float absolute bottom-0 right-1/4 h-24 w-24 text-accent/10"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <rect x="10" y="10" width="80" height="80" rx="20" />
          </svg>
        </div>

        <div className="animate-fade-up flex items-center gap-2">
          <span className="badge badge-news font-semibold px-3 py-1">
            Independent · Student-run
          </span>
          <span className="badge badge-community px-3 py-1">
            Tamil Nadu & Beyond
          </span>
        </div>

        <div className="animate-fade-up-delay space-y-3">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink-100 leading-tight">
            Kala Nilavaram
            <span className="block text-xl sm:text-2xl font-normal text-brand-light mt-2">
              Ground reality of schools.
            </span>
          </h1>

          <p className="max-w-2xl text-base sm:text-lg text-ink-300 leading-relaxed">
            An independent, multi-tenant digital platform for transparency, welfare, and student community
            inside schools — not affiliated with or controlled by any single school&apos;s administration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/auth/sign-in" className="btn-primary px-6 py-2.5 text-sm shadow-lg shadow-brand/25">
            Sign In / Join
          </Link>
          <Link
            href="/schools"
            className="rounded-full border border-ink-700 bg-ink-900/80 px-5 py-2.5 text-sm font-semibold text-ink-100 hover:bg-ink-800 hover:border-ink-600 transition"
          >
            Browse All Schools →
          </Link>
          <Link
            href="/schools/new"
            className="rounded-full border border-brand/40 bg-brand/10 px-5 py-2.5 text-sm font-semibold text-brand-light hover:bg-brand/20 transition"
          >
            + Start a Chapter
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid sm:grid-cols-2 gap-4">
        {FEATURE_HIGHLIGHTS.map((f) => (
          <div
            key={f.title}
            className="card card-hover p-5 space-y-2 hover:border-brand/40 bg-gradient-to-b from-ink-900 to-ink-950"
          >
            <div className="text-2xl">{f.icon}</div>
            <h3 className="font-semibold text-base text-ink-100">{f.title}</h3>
            <p className="text-xs text-ink-300 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Active Chapters */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-ink-800 pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
            Active School Chapters
          </h2>
          <Link href="/schools" className="text-xs text-brand-light hover:underline">
            View directory ({activeChapters.length}) →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {activeChapters.map((t) => (
            <Link
              key={t.slug}
              href={`/school/${t.slug}/feed`}
              className="card card-hover block p-4 hover:border-brand/60 hover:bg-ink-900/90 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink-100 group-hover:text-brand-light transition">
                    {t.name}
                  </p>
                  <p className="text-xs text-ink-500 mt-1">
                    {t.city}, {t.state ?? 'Tamil Nadu'}
                  </p>
                </div>
                <span className="badge badge-community group-hover:bg-brand/20 group-hover:text-brand-light transition">
                  Enter →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
