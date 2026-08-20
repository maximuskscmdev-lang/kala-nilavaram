# Phase 2 Roadmap

Sequenced by dependency and effort, assuming Phase 1 is stable and live
with at least one pilot school actively using every feature.

## 1. Push notifications (do first — highest retention impact)
- Web push for the PWA (VAPID keys, `push_subscriptions` table, a Supabase
  Edge Function triggered on: new article published, complaint status
  update, weekly discussion reminder, new episode/video drop).
- Native push (APNs/FCM) once the Bubblewrap/Capacitor wrappers exist —
  same backend endpoint, different delivery channel.

## 2. Basic creator tools + editorial analytics
- Scheduling posts (publish-at timestamp on `posts`, a small cron to flip
  status at the scheduled time).
- Analytics dashboard for editorial teams: views, top content, submission
  funnel (submitted → in_review → published/rejected conversion, time-to-
  review). This also directly supports the "move recognition rounds from
  bi-monthly to monthly once the pipeline can support it" admin-configurable
  cadence already built into `recognition_rounds.interval_months`.

## 3. Weekly discussion / round-table events module
- RSVP + calendar links (`.ics` generation, Google Calendar add-link).
- Post-event write-ups/recordings linked back into the feed as a `posts`
  row with `type = 'event'` (schema already supports this).

## 4. Podcast / YouTube "Media" tab
- Start as the Phase 1 stub (simple "Latest Episodes" embed block already
  scoped for Phase 1 per Section 11) → full Media tab pulling episodes/
  videos via oEmbed or the relevant platform API, with its own filter/tag
  system consistent with the news feed's category system.

## 5. In-app "assign role" admin UI
- Phase 1 assumes School Admins assign Editor/Moderator/teacher-employment-
  verification roles via the Supabase dashboard directly. Once there are
  more than 2–3 pilot schools, build a proper in-app admin UI for this
  (`app/school/[slug]/admin/members/`) — reduces onboarding friction and
  reduces the risk of a Supabase-dashboard mistake affecting production
  data.

## 6. Expansion tooling
- Multi-city rollout support: nothing in the schema is Chennai-specific
  (`tenants.city`/`state` are free text), but the self-serve chapter
  request flow (`/schools/new`) should get a lightweight admin review
  queue UI once volume grows past a few requests a week.
- Consider subdomain-per-school (`<slug>.kalanilavaram.com`) only if a
  school specifically asks for a branded URL — see the path-vs-subdomain
  reasoning in `docs/01-stack-and-reasoning.md`.

## Explicitly deferred (not in Phase 2 either, unless demand appears)
- Native mobile-only features requiring app-store-exclusive APIs (e.g.,
  widgets, background location) — the TWA/Capacitor wrappers are
  intentionally thin, and adding native-only features increases
  maintenance burden disproportionately for a small team.
- Self-hosted podcast/video — Phase 1 and Phase 2 both stay embed/link-only
  by design (Section 4, Phase 2 bullet 1); revisit only if the in-house
  media program grows enough to justify the hosting cost and complexity.
