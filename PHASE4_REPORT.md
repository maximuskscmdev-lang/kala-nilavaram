# Kala Nilavaram — Audit Fixes & Verification Report

**Date:** 2026-08-21
**Scope:** Fix every bug identified in the audit (HIGH / MEDIUM / LOW / cosmetic / INFO), verify all user actions & UI render correctly via a headless Playwright browser, and report.
**Stack:** Next.js 14 + Supabase (multi-tenant student-school platform).

---

## 1. Verification result (Phase 3)

A headless Chromium suite (`apps/web/e2e/verify.mjs`) launched `next start` on `:3000` and rendered every user-facing action route. A test tenant (`e2e-test-school`), a test user (service-role created), a verified `editor` membership, a teacher profile, and an **open** recognition round were seeded via the real Supabase project so conditional forms actually render.

| Route | Result | Notes |
|---|---|---|
| `/` | PASS (200) | Landing renders |
| `/schools` | PASS (200) | Chapter list |
| `/schools/new` | PASS (200) | Start-a-chapter form |
| `/auth/sign-in` | PASS (200) | Sign-in form |
| `/school/[slug]/feed` | PASS (200) | Public feed (pagination wired) |
| `/school/[slug]/feed/submit` | PASS (200) | Article form (`name="body"` etc. present) |
| `/school/[slug]/reviews` | PASS (200) | Review hub |
| `/school/[slug]/reviews/submit?role=student` | PASS (200) | Review submit form |
| `/school/[slug]/teachers` | PASS (200) | Best-teacher hub |
| `/school/[slug]/teachers/nominate` | PASS (200) | Nomination form (`statement`, `subjectTaught`, `yearsAtSchool` present) |
| `/school/[slug]/study` | PASS (200) | Study hub |
| `/school/[slug]/study/upload` | PASS (200) | Upload form (`name="title"` present) |
| `/school/[slug]/whistleblower` | PASS (200) | Report form (`name="description"` present) |
| `/school/[slug]/admin/recognition` | PASS (200) | Admin panel renders for `editor` role |
| `/school/[slug]/editorial` | PASS (200) | Editorial queue |
| `/school/[slug]/moderation/inbox` | PASS (200) | Moderation inbox |
| `/school/[slug]/moderation/reviews` | PASS (200) | Review moderation |
| `/school/[slug]/queue` | PASS (200) | Editorial queue alias |
| `/admin/chapters` | PASS (200) | Super-admin chapters |

**19/19 routes rendered with no fatal `pageerror` and no console errors.** The authenticated flow (tenant + user + session cookie) exercised the gated UIs successfully.

> Notable: the recognition admin page correctly **refused to render** for a `student` role (returned the "not authorized" branch) and **did render** once the test user was an `editor` — confirming role-based access control works. Likewise the nomination form correctly stays hidden until an **open** round exists.

`npm run build`, `npm run typecheck`, and `npm run lint` all pass.

---

## 2. Code fixes applied (by bug)

### HIGH
- **#2 — Review `reviewer_role` spoofable from client.** `app/school/[slug]/reviews/actions.ts:110` now derives `reviewer_role` from the caller's real `membership.role`, never trusting a client field.
- **#11 / #12 — Nomination `subject_taught`/`years_at_school` lost + duplicate ballot-stuffing.** `app/school/[slug]/teachers/nominate/actions.ts:92` persists both columns; `:101` catches the unique-constraint violation and returns a friendly "already nominated" message.
- **#15 — Race in 1-review-per-period limit.** `app/school/[slug]/reviews/actions.ts:81` calls the new atomic `acquire_review_lock()` RPC (unique insert) instead of the racy read-then-insert app check.
- **#17 — Study upload accepted arbitrary `fileUrl`/`linkUrl`.** `app/school/[slug]/study/actions.ts:45-69` (`UploadSchema.superRefine`) requires `linkUrl` to be `https`, and `fileUrl` to be `https` **and** bucket-scoped to `study-files` on the project host.
- **#1 — Encryption key fell back to a hardcoded demo key.** `lib/config.ts:72` `getWhistleblowerEncryptionKey()` now **throws** if `WHISTLEBLOWER_ENCRYPTION_KEY` is unset (no more `MOCK_WHISTLEBLOWER_KEY`).
- **#6 — Decrypt silently fell back to plaintext JSON.** `lib/crypto/encryption.ts:98` now throws + logs on decrypt failure instead of returning attacker-controllable plaintext.

### MEDIUM
- **#3 / #4 — Whistleblower identity exposed to `school_admin`.** Migration `0014` recreates `wb_select_staff` / `wb_identity_log_select_staff` policies and `reveal_whistleblower_identity()` to admit **`moderator` + `super_admin` only** (school_admin can still triage metadata but never read contact info or invoke the reveal).
- **#5 / #20 — Low-entropy tracking IDs.** `lib/crypto/encryption.ts:40` `generateTrackingId()` now uses `randomBytes(6)` (12 hex chars); `0014` `generate_tracking_id()` bumped to 9 random bytes → 12 hex (from 8).
- **#7 — Pen-name lookup matched `ILIKE` (collisions).** `app/school/[slug]/reviews/actions.ts:144`, `feed/submit/actions.ts`, `feed/[id]/actions.ts` now match the **exact** `pen_name`.
- **#13 / #16 — `awardTeacher` accepted bad scores / closed rounds.** `app/school/[slug]/admin/recognition/actions.ts:127-138` validates each score is 0–100 and that `review+nomination+editorial === total`; `:127` requires `status='open'`.
- **#10 — Study upvote allowed cross-tenant votes.** `app/school/[slug]/study/actions.ts:124` verifies the item belongs to the tenant and the voter is a verified member before toggling.
- **#14 — Cron endpoint had no auth + broken RSS decode.** `app/api/cron/aggregate-news/route.ts:31,34` now 401s without a valid `CRON_SECRET`; `decodeEntities()` (`:109`) handles numeric/hex entities.

### LOW / COSMETIC
- **#8 — Misleading "moderated community comments" copy.** `app/school/[slug]/feed/[id]/page.tsx` doc/comment corrected to "community comments" (auto-publish is intentional per your decision).
- **#9 — Dangerous `source_url` could point anywhere.** `components/post-card.tsx:23` `safeExternalUrl()` only allows `http(s)`; used at `:81`.
- **#18 — Reaction toggle race (duplicate rows).** `0014` adds unique index `post_reactions_unique_idx` on `(post_id, user_id, reaction_type)`.
- **#22 — `?page=` not supported on feed.** `app/school/[slug]/feed/page.tsx:93-96,189-199` adds 30/page pagination with Newer/Older links.
- **#23 — Unknown slug rendered instead of 404.** `reviews/page.tsx`, `teachers/page.tsx`, `study/page.tsx` now `notFound()` on unknown tenant.
- **#24 — `/whistleblower` could leak Referrer.** `middleware.ts:56` sets `Referrer-Policy: no-referrer` on whistleblower routes.
- **#25 — `startRecognitionRound` ignored dates.** `app/school/[slug]/admin/recognition/actions.ts:67` derives `interval_months` from the chosen start/end dates.
- **#26 — "Markdown supported" misleading.** `app/school/[slug]/feed/submit/page.tsx` copy changed to plain-text wording.

### INFO / DEFENSE-IN-DEPTH (already blocked by RLS at DB layer)
- **#19 / #21 — Cross-tenant mutations in reviews/feed/study server actions.** Server actions use the RLS-bound `createClient()`, and the relevant mutations already scope by tenant (and `study/actions.ts` now additionally re-checks tenant + verified membership per #10). No code change required beyond the hardening above; RLS remains the authoritative guard.

---

## 3. Database migration

**File:** `supabase/migrations/0014_audit_fixes.sql` — **NOT yet applied to the live project.**

Includes:
1. Drops the dead 7-arg PGP `submit_whistleblower_report` overload (0008).
2. Adds `teacher_nominations.subject_taught` + `years_at_school`.
3. New `review_rate_locks` table + `acquire_review_lock()` (atomic rate guard).
4. Unique index `post_reactions_unique_idx`.
5. Higher-entropy `generate_tracking_id()`.
6. Whistleblower identity policies/functions restricted to `moderator`+`super_admin`.

> Until this migration is applied, runtime flows that touch the **new nomination columns** (`teachers/nominate`) and the **new lock table** (`reviews/submit`) will fail at the DB. The UI renders fine (verified), but submissions need the migration live.

---

## 4. Blockers / next steps for you

1. **Apply migration `0014`.** Either:
   - Paste `supabase/migrations/0014_audit_fixes.sql` into the Supabase **SQL Editor** and run it, **or**
   - Provide `SUPABASE_DB_URL` (or the DB password) so I can run `psql "$SUPABASE_DB_URL" -f supabase/migrations/0014_audit_fixes.sql`.
2. **Cleanup of test data (optional).** The verification created a real `e2e-test-school` tenant, a test auth user, an `editor` membership, a teacher profile, and an open `E2E Round` in your Supabase project. Say the word and I'll delete them.
3. **Re-run Playwright after migration** if you want the nomination/review-submit *submissions* (not just render) exercised end-to-end.

---

## 5. How to reproduce verification

```bash
cd apps/web
npm run build && npm run start &          # serves :3000
npm i -D playwright && npx playwright install --with-deps chromium
node e2e/verify.mjs                        # renders all routes, prints PASS/FAIL table
```

All routes currently PASS.
