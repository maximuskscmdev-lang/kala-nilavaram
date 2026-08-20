# Launch Checklist

## Legal & policy (do first — longest lead time)
- [ ] Privacy Policy, Terms of Service, Content Moderation Policy reviewed
      by a lawyer/consultant qualified in Indian law (DPDP Act) — see
      review checklists at the bottom of each doc in `docs/policies/`.
- [ ] Whistleblower safety-escalation workflow (Content Moderation Policy,
      Section 5) specifically reviewed by a child-safety or education-law
      consultant in Tamil Nadu.
- [ ] Grievance Officer named and contactable (IT Rules 2021 requirement).
- [ ] Confirm minor-consent treatment for DPDP Act once rules are finalized.
- [ ] Decide and document final data retention windows (currently
      placeholders in the Privacy Policy).

## Infrastructure
- [ ] Supabase project created, all migrations applied (`supabase db push`).
- [ ] RLS verified: log in as a test student from School A, confirm you
      cannot read School B's whistleblower_reports, memberships, or draft
      posts (spot-check a few tables directly via the anon key, not just
      through the UI).
- [ ] Storage buckets created with correct public/private settings
      (`study-uploads` public, `whistleblower-evidence` private).
- [ ] `WHISTLEBLOWER_ENCRYPTION_KEY` generated, stored only in Vercel env
      vars + a password manager (not in git, not in Slack/WhatsApp).
- [ ] Domain attached, HTTPS confirmed, Supabase Auth Site URL updated to
      match production domain.
- [ ] Phone OTP provider tested end-to-end with a real Indian number.
- [ ] Google Sign-In tested end-to-end.
- [ ] Rate limiting / CAPTCHA added to the whistleblower submission form
      (see `docs/04-setup-to-launch.md`, step 10) — **do not skip this.**
- [ ] `X-Robots-Tag: noindex` confirmed present on `/school/*/whistleblower*`
      routes (already wired in `middleware.ts` — verify in production
      response headers).
- [ ] News aggregation cron running and de-duplicating correctly (check
      Vercel Cron logs after first scheduled run).

## Roles & moderation readiness
- [ ] At least one Super Admin account confirmed working.
- [ ] Per pilot school: at least 2–3 named Moderators for the whistleblower
      inbox, ideally not all from the same school (per Section 5).
- [ ] Per pilot school: at least 1–2 Editors for the news/study queue.
- [ ] Confirmed no teacher account holds Editor or Moderator role anywhere
      (conflict-of-interest rule — currently policy-enforced; consider a
      DB constraint or admin-side warning if the team scales past manual
      checking).
- [ ] Verification process for students/teachers (personal contact call)
      documented and at least one team member assigned to actually do it.

## Content & UX
- [ ] Real logo/wordmark dropped into `apps/web/public/icons/` (placeholder
      palette is in `tailwind.config.ts` — swap once branding exists).
- [ ] At least a handful of seed News/Study posts published per pilot
      school so the feed isn't empty on day one.
- [ ] "How winners are chosen" explainer reviewed and published
      (`app/school/[slug]/teachers/how-it-works/page.tsx`).
- [ ] Mobile install flow tested on a real Android phone ("Add to Home
      Screen" from Chrome) — this alone gets you 90% of "app" feel with
      zero store review risk, and can launch before Bubblewrap/Capacitor
      builds are ready.

## Store packaging (can trail the web launch)
- [ ] Play Console account created, Bubblewrap build signed, Digital Asset
      Links published, Data Safety form completed honestly.
- [ ] Apple Developer account created, Capacitor build archived, account
      deletion flow live in-app, Sign in with Apple added if Google login
      is offered.

## Post-launch monitoring (first 2 weeks)
- [ ] Daily check of the moderation inbox across all pilot schools — don't
      let the "someone will check eventually" assumption apply during the
      most vulnerable early period.
- [ ] Weekly check of Supabase usage against free-tier limits (storage,
      egress, monthly active users) to catch upgrade timing early.
- [ ] Collect editorial team feedback on the submission → review pipeline
      friction, since Phase 1 has no analytics dashboard yet.
