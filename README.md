# Kala Nilavaram

_"Ground reality of schools."_ An independent, student-run, multi-tenant
platform for transparency, welfare, and community inside schools — built as
a PWA-first Next.js + Supabase app for a small, non-specialist student team.

This repo is the full build for the Phase 1 (MVP) feature set: campus +
aggregated news feed with an editorial workflow, a student study-content
hub, an anonymous-but-shielded whistleblower/complaint inbox, a dual-track
student/teacher school review system, pen-name/anonymous authorship, and a
"Best Teacher" recognition program.

## Start here

| Doc | What it covers |
|---|---|
| [`docs/01-stack-and-reasoning.md`](docs/01-stack-and-reasoning.md) | Tech stack + why, budget breakdown, path-vs-subdomain decision |
| [`docs/02-database-schema.md`](docs/02-database-schema.md) | Multi-tenant schema map, RLS design, sensitive-data handling |
| [`docs/03-repo-structure.md`](docs/03-repo-structure.md) | Folder-by-folder guide |
| [`docs/04-setup-to-launch.md`](docs/04-setup-to-launch.md) | **Exact CLI commands** — accounts, local setup, first deploy |
| [`docs/06-pwa-and-app-packaging.md`](docs/06-pwa-and-app-packaging.md) | PWA config + Bubblewrap (Android) + Capacitor (iOS) |
| [`docs/07-launch-checklist.md`](docs/07-launch-checklist.md) | Pre-launch checklist |
| [`docs/08-phase2-roadmap.md`](docs/08-phase2-roadmap.md) | What's next, in order |
| [`docs/policies/`](docs/policies) | Draft Privacy Policy, Terms of Service, Content Moderation Policy — **all require legal review before launch** |

## Quickstart (assumes accounts already exist — see docs/04 for that part)

```bash
cd apps/web
npm install
cp .env.example .env.local   # fill in Supabase + other keys
npm run dev
```

## Repo layout

```
apps/web/        Next.js 14 App Router PWA — the entire product
supabase/        SQL migrations + seed data (multi-tenant schema, RLS)
docs/            Architecture, setup, packaging, launch docs, draft policies
```

## Non-negotiable safety notes (read before touching whistleblower code)

The anonymous whistleblower/complaint inbox (`app/school/[slug]/whistleblower/`,
`app/school/[slug]/moderation/`, `supabase/migrations/0004_whistleblower.sql`
and `0008_whistleblower_submit_function.sql`) is the most sensitive part of
this platform — minors reporting on adults/institutions. Contact details are
encrypted at rest and only reachable through an audited Postgres function
(`reveal_whistleblower_identity`), every identity view is logged, complaint
routes are never indexed or cached, and safety-flagged reports visibly
prompt real-world escalation rather than sitting in a queue. Before
production launch, this workflow specifically needs review by a lawyer or
child-safety consultant in Tamil Nadu — see `docs/policies/content-moderation-policy.md`.
