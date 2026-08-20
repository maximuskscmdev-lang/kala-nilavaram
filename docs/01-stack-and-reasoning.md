# Recommended Stack + Reasoning

## Summary

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React + TypeScript | Huge AI-pair-programming corpus, file-based routing maps cleanly to `/school/[slug]/...` multi-tenancy, Server Actions remove the need to hand-build a separate API layer for forms. |
| Styling | Tailwind CSS | Fast to iterate with AI tools, no design-system overhead, easy to keep the "small confident palette" from Section 7. |
| Backend / DB / Auth / Storage | Supabase (Postgres) | One free-tier account covers auth (email OTP + Google), Postgres with Row Level Security for real multi-tenant isolation, file storage, and Edge Functions for background jobs — avoids hand-building auth or a separate API service. |
| Hosting | Vercel (web app) | First-class Next.js support, generous free tier, built-in Cron for the news-aggregation job, zero-config preview deployments per PR — good fit for a small, non-specialist team. |
| PWA / native wrapping | next-pwa, then Bubblewrap (Android) + Capacitor (iOS) | One web codebase, thin native shells only for store presence — see `docs/06-pwa-and-app-packaging.md`. |

## Why Supabase over Firebase

Both are reasonable; Supabase was chosen because:
- **Row Level Security is Postgres-native**, which maps directly onto this
  platform's hardest requirement: a School Moderator must see only their
  tenant's data, a Super Admin sees everything, and the whistleblower table
  needs the strictest, most auditable access control on the platform. RLS
  policies live in `supabase/migrations/0007_rls_policies.sql` and are
  enforced by the database itself, not application code — so a bug in a
  Next.js route can't leak another school's data.
- **Relational modeling** fits this domain well (tenants → memberships →
  posts/reviews/reports, with foreign keys and check constraints like "a
  teacher review can never target a named colleague" enforced at the schema
  level, not just in application code).
- **pgcrypto** gives the whistleblower inbox real encryption-at-rest for
  contact details, decryptable only through an audited Postgres function —
  see `supabase/migrations/0004_whistleblower.sql` and `0006_helper_functions.sql`.
- Free tier and pricing are competitive and predictable at this project's
  target scale (see budget table below).

## Why Next.js Server Actions over a separate API

A small, non-specialist team building with AI assistance benefits from
fewer moving parts. Server Actions (`'use server'` functions colocated with
each feature, e.g. `app/school/[slug]/whistleblower/actions.ts`) remove the
need for a separate Express/Fastify API, separate deployment, and separate
auth wiring — one Vercel deploy ships both the UI and its backend logic,
still protected by the same Supabase RLS policies underneath.

## Budget reality check (₹4,000–5,000 / ~$50–60 per month sustainable spend)

| Service | Free tier | Roughly covers | When you'd pay |
|---|---|---|---|
| Supabase | 500MB DB, 1GB file storage, 50K monthly active users (auth), 2 free projects, 5GB egress/mo | Comfortably covers 500 creators / 5,000 viewers at launch | Pro plan ($25/mo) once storage/egress grows past free tier — budget for this within month 2–4 as study-hub file uploads accumulate |
| Vercel | 100GB bandwidth/mo, unlimited requests on Hobby (non-commercial) or Pro ($20/mo, needed once this is a real org/product) | Hobby may be enough to prototype, but a named, revenue-adjacent org project should go on **Pro ($20/mo)** for the commercial terms + higher limits | From month 1, budget for Vercel Pro |
| News API (NewsData.io free tier) | 200 requests/day | Enough for a 6-hourly cron pulling a handful of feeds (`vercel.json` cron is set to every 6 hours) | If you add many more feeds/schools, consider self-hosted RSS parsing (already the default in `route.ts` — NewsData.io is optional) |
| Supabase email (OTP/magic-link delivery) | Included on the free tier (2,000 emails/mo at free tier SMTP limits) | Sign-in links for all email OTP logins — no separate SMS provider needed | Upgrade to a custom SMTP provider only if email volume/limits become a constraint |
| Domain | ~₹800–1,200/year | — | Annual, not monthly |

**Realistic month-1 spend: ₹0** (email OTP is free; only optional Vercel Pro adds cost). **Realistic month-6 spend at target scale: ₹3,000–4,500**,
comfortably inside the ₹4,000–5,000 budget, with Supabase Pro ($25 ≈ ₹2,080)
as the main step-up cost once free-tier storage/egress is exceeded.

## Path-based vs subdomain multi-tenancy (Section 3 decision)

**Chosen: path-based** (`kalanilavaram.com/school/<slug>`), not
`<slug>.kalanilavaram.com`. Reasoning: wildcard subdomains need extra DNS +
SSL configuration and, on Vercel's Hobby/early Pro tiers, more setup
friction than a single domain with dynamic routes. Path-based routing is a
plain Next.js dynamic segment (`app/school/[slug]/...`, already scaffolded)
with zero extra infra. Revisit subdomains later if a school specifically
wants a branded `theirschool.kalanilavaram.com` URL — the routing structure
does not need to change to support that later, only the DNS/hosting layer.
