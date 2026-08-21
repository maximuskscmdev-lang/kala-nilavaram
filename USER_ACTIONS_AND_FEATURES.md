# Kala Nilavaram — User Actions & Features Map

Complete reference of everything a user can do and every system they interact with,
organized by user type. (Role enums from `app/school/[slug]/layout.tsx:73` and the
`actions.ts` server-action files.)

---

## A. Cross-cutting systems (everyone)

- **Multi-tenant chapters** — the app is partitioned by school (`/school/[slug]`);
  all data is scoped to a tenant.
- **Authentication** (Supabase) — sign in / sign up / OAuth callback
  (`/auth/sign-in`, `/auth/callback`).
- **Onboarding** (`/onboarding`) — capture real identity (Section 4E) + pick your
  school and role (student / teacher / peer).
- **Role model** — `super_admin`, `moderator`, `school_admin`, `editor`,
  `student`, `teacher`, plus anonymous/pen-name modes for reviews.
- **RLS security** — every query is row-level-scoped to the tenant/membership.
- **PWA / offline** — service worker (`/public/sw.js`) for installable,
  offline-capable app.
- **Encryption + privacy** — whistleblower contacts are encrypted at rest; tracking
  IDs are high-entropy (`KN-YYYY-XXXXXXXXXXXX`).

---

## B. Visitor (not signed in)

| Action | Where |
|---|---|
| Browse the landing page / "ground reality" articles | `/` |
| List all school chapters | `/schools` |
| Request to start a new chapter | `/schools/new` → `requestNewChapter()` |
| Read a chapter's public feed | `/school/[slug]/feed` (paginated) |
| Read a full article | `/school/[slug]/feed/[id]` |
| View teacher reviews hub | `/school/[slug]/reviews` |
| View "Best Teacher" hub + how-it-works | `/school/[slug]/teachers`, `/teachers/how-it-works` |
| View study materials | `/school/[slug]/study` |
| **Submit a whistleblower report** (encrypted, gets a tracking ID) | `/school/[slug]/whistleblower` → `submitWhistleblowerReport()` |
| **Track a report's status** with tracking ID (no login) | `/school/[slug]/whistleblower/track` → `lookupReportStatus()` |
| See submission confirmation | `/school/[slug]/whistleblower/confirmation` |

---

## C. Signed-in member (student / teacher / peer)

Everything in **B**, plus:

| Action | Where |
|---|---|
| **Submit an article/post** for editorial review | `/school/[slug]/feed/submit` → `submitPost()` |
| **Comment** on an article (community comments) | article page → `addComment()` |
| **React** to posts (like / heart / clap / insightful) | `toggleReaction()` |
| **Submit a student review** (display mode: real / pen-name / anonymous) | `/school/[slug]/reviews/submit?role=student` → `submitStudentReview()` |
| **Submit a teacher review** (teacher track) | `/reviews/submit?role=teacher` → `submitTeacherReview()` |
| **Nominate a teacher** for "Best Teacher" (statement, subject taught, years at school) | `/school/[slug]/teachers/nominate` → `nominateTeacher()` |
| **Upload study material** (note/pdf/image/link, https-validated) | `/school/[slug]/study/upload` → `uploadStudyItem()` |
| **Upvote study material** | study hub → `upvoteStudyItem()` |
| Access the **Queue** (staff editorial view) once signed in | `/school/[slug]/queue` |

---

## D. Staff — Editor / Moderator / School Admin

Granted via the chapter nav (`layout.tsx:73`): `editor`, `moderator`,
`school_admin` are "staff"; `moderator`+`school_admin` get the Moderation Inbox.

| Action | Role | Where |
|---|---|---|
| **Approve / reject submitted articles** | editor+ | `/school/[slug]/editorial` → `approvePost()` / `rejectPost()` |
| **Publish / flag / remove reviews** | editor+ | `/school/[slug]/moderation/reviews` → `publishReview()` / `flagReview()` / `removeReview()` |
| **Update whistleblower report status** | moderator, school_admin | `/school/[slug]/moderation/inbox` → `updateReportStatus()` |
| **Set safety flag** on a report | moderator, school_admin | `setSafetyFlag()` |
| **Reveal whistleblower identity** (audit-logged) | **moderator + super_admin only** | `revealIdentity()` |
| **Start a recognition round** (derives interval from dates) | editor, school_admin | `/school/[slug]/admin/recognition` → `startRecognitionRound()` |
| **Award a teacher** (validated 0–100 score breakdown) | editor, school_admin | `awardTeacher()` |

---

## E. Super Admin (global)

| Action | Where |
|---|---|
| **Approve / reject / suspend chapters** | `/admin/chapters` → `approveChapter()` / `rejectChapter()` / `suspendChapter()` |
| Full access to all chapters' staff/moderation surfaces | (isSuper bypasses tenant checks) |
| Whistleblower identity reveal | `revealIdentity()` |

---

## F. Automated / background systems

- **News aggregation cron** (`/api/cron/aggregate-news`, protected by
  `CRON_SECRET`) — pulls external news into the feed.
- **Recognition scoring & awards** — transparent score breakdown
  (review % + nomination % + editorial %) published with winners.
- **Rate limiting** — one review per member per month
  (`review_rate_locks` / `acquire_review_lock()`).
- **Reaction de-duplication** — unique index prevents double-counting.
- **Notification hooks** (if wired) around chapter approval, award
  announcements, and moderation events.

---

## Role matrix (summary)

- **Anonymous / Visitor:** read everything public + submit/track whistleblower reports.
- **Member:** + post articles, comment, react, reviews (real/pen/anon),
  nominate teachers, upload/upvote study items.
- **Editor / School Admin:** + editorial approve/reject, review moderation,
  recognition rounds & awards, inbox triage.
- **Moderator:** + safety flags + identity reveal (with super_admin).
- **Super Admin:** global chapter governance + identity reveal.
