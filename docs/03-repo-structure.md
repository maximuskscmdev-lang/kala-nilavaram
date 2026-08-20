# Repo Structure

```
kala-nilavaram/
├── apps/
│   └── web/                          # Next.js 14 App Router PWA — the whole product
│       ├── app/
│       │   ├── page.tsx              # marketing/home + active-chapter list
│       │   ├── layout.tsx, globals.css
│       │   ├── auth/
│       │   │   ├── sign-in/page.tsx  # email OTP/magic link + Google
│       │   │   └── callback/route.ts # OAuth code + magic-link token exchange
│       │   ├── onboarding/           # real identity + school/role capture
│       │   ├── schools/              # browse tenants + self-serve "start a chapter"
│       │   ├── school/[slug]/        # everything tenant-scoped lives under here
│       │   │   ├── layout.tsx        # tenant nav shell
│       │   │   ├── feed/             # news/events feed, submit, per-post
│       │   │   ├── editorial/        # editor approval queue
│       │   │   ├── study/            # study hub list + upload
│       │   │   ├── whistleblower/    # submit + track (public-facing, noindex)
│       │   │   ├── moderation/inbox/ # moderator triage (audited identity reveal)
│       │   │   ├── reviews/          # dual-track student/teacher reviews
│       │   │   ├── teachers/         # recognition showcase + nominate
│       │   │   └── admin/recognition/# award workflow (editor/school_admin only)
│       │   └── api/
│       │       └── cron/aggregate-news/route.ts   # RSS aggregation job
│       ├── components/               # shared UI (PostCard, etc.)
│       ├── lib/
│       │   ├── supabase/             # browser/server/service-role clients + generated types
│       │   └── auth/roles.ts         # membership/role resolution helpers
│       ├── middleware.ts             # session refresh + whistleblower noindex headers
│       ├── public/                   # manifest.json, icons/
│       ├── next.config.js            # next-pwa service worker config
│       ├── tailwind.config.ts        # placeholder brand palette
│       └── package.json
├── supabase/
│   ├── migrations/                   # 0001..0008, applied in order — see docs/02
│   ├── seed.sql                      # local/dev demo data
│   └── config.toml                   # Supabase CLI project config
├── docs/
│   ├── 01-stack-and-reasoning.md
│   ├── 02-database-schema.md
│   ├── 03-repo-structure.md          # (this file)
│   ├── 04-setup-to-launch.md
│   ├── 06-pwa-and-app-packaging.md
│   ├── 07-launch-checklist.md
│   ├── 08-phase2-roadmap.md
│   └── policies/
│       ├── privacy-policy.md
│       ├── terms-of-service.md
│       └── content-moderation-policy.md
├── scripts/                          # one-off admin/maintenance scripts (add as needed)
└── README.md
```

## Why a monorepo-shaped layout with one app

`apps/web` is deliberately the only app today — the `apps/` wrapper exists
so Phase 2 additions (a shared `packages/ui` component library, or a
separate admin dashboard app) can be added later without restructuring
everything that already exists. Don't add that complexity now; it's just
cheap insurance for later.

## Where things "should" live as the codebase grows

- New tenant-scoped feature → new folder under `app/school/[slug]/`, plus a
  migration in `supabase/migrations/` if it needs new tables, plus RLS
  policies in the same style as `0007_rls_policies.sql`.
- New cross-tenant/global feature (e.g., a Phase 2 admin analytics
  dashboard) → `app/admin/` at the top level, gated by `is_super_admin()`.
- Reusable UI → `components/`.
- Anything touching the whistleblower encryption key or service-role client
  → server-only code (`'use server'` files or `route.ts` handlers), never a
  Client Component.
