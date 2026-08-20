# Setup → First Deploy Manual

Written for a small, non-professional student team. Follow in order.

## 0. Accounts to create (before touching code)

1. **GitHub** — free. Host the repo here.
2. **Supabase** — free tier, sign up at supabase.com. Create an
   organization for the project.
3. **Vercel** — free tier to start (`vercel.com`), sign in with GitHub.
4. **Google Cloud Console** — for Google Sign-In OAuth credentials
   (console.cloud.google.com — free).
5. Optional at launch, needed before Phase 1 news aggregation matters a lot:
   **NewsData.io** free API key (only if you want a News API instead of
   pure RSS — the code in `apps/web/app/api/cron/aggregate-news/route.ts`
   works with plain RSS feeds by default, no API key needed).

> No SMS provider is needed. Sign-in is Google OAuth + email OTP (magic
> link); Supabase delivers the sign-in emails itself on the free tier.

## 1. Local environment

```bash
node -v   # confirm Node 18.18+ (use nvm if not: nvm install 18 && nvm use 18)
git clone <your-repo-url> kala-nilavaram
cd kala-nilavaram/apps/web
npm install
```

## 2. Create the Supabase project

```bash
npm install -g supabase
supabase login

# From the repo root (kala-nilavaram/), where supabase/config.toml lives:
cd ../../
supabase init          # if config.toml doesn't already exist — this repo ships one, so you can skip this
supabase link --project-ref <your-project-ref>   # get the ref from the Supabase dashboard URL
```

Apply the schema:

```bash
supabase db push        # applies every file in supabase/migrations/, in order
```

(For local development against a Dockerized Postgres instead of the hosted
project, run `supabase start` first, then `supabase db reset` to apply
migrations + `seed.sql` locally.)

Seed demo data (optional, local/dev only — do not run against production):

```bash
psql "$(supabase status -o json | jq -r .DB_URL)" -f supabase/seed.sql
```

## 3. Configure Supabase Auth

In the Supabase dashboard → Authentication → Providers:

- **Email**: must be enabled (it is by default). This powers email OTP /
  magic-link sign-in. Under Authentication → Sign In / Up, keep "Email
  confirmations" on so every login is a verified email.
- **Google**: enable, paste the Client ID/Secret from Google Cloud Console
  (create an OAuth 2.0 Client ID of type "Web application" there; add
  `https://<your-project-ref>.supabase.co/auth/v1/callback` as an
  authorized redirect URI, plus `http://localhost:3000/auth/callback` for
  local dev and your production domain's `/auth/callback`).
- **Phone**: leave disabled — the app no longer uses SMS OTP, so no
  Twilio/MSG91 setup is required.

Authentication → URL Configuration: set Site URL to your production domain
once you have one (e.g., `https://kalanilavaram.com`), and add
`http://localhost:3000` under additional redirect URLs for local dev. Your
production domain's `/auth/callback` must also be a redirect URL — the email
magic link lands there and the code swaps it for a session.

## 4. Configure Storage (for study-hub uploads + evidence files)

Dashboard → Storage → create two buckets:
- `study-uploads` (public read, authenticated write)
- `whistleblower-evidence` (**private** — no public read; access only via
  signed URLs generated server-side for moderators, mirroring the
  identity-reveal pattern in `reveal_whistleblower_identity()`)

## 5. Environment variables

```bash
cd apps/web
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — same page; **never** commit this or expose it client-side
- `SUPABASE_PROJECT_ID` — the project ref
- `WHISTLEBLOWER_ENCRYPTION_KEY` — generate with `openssl rand -base64 32`; store this **only** in Vercel's encrypted env vars and your password manager, never in git
- `CRON_SECRET` — any random string, e.g. `openssl rand -hex 24`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 3
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` locally

## 6. Generate types and run locally

```bash
npm run gen:types   # requires SUPABASE_PROJECT_ID to be set and `supabase login` done
npm run dev
```

Visit `http://localhost:3000`. Sign in, complete onboarding, and manually
promote yourself to `super_admin` for testing:

```sql
-- run in Supabase SQL editor, using your own auth.users.id
insert into platform_admins (user_id) values ('<your-auth-user-id>');
```

## 7. First deploy (Vercel)

```bash
npm install -g vercel
vercel login
cd apps/web
vercel link                 # creates/links a Vercel project
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_PROJECT_ID production
vercel env add WHISTLEBLOWER_ENCRYPTION_KEY production
vercel env add CRON_SECRET production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add NEXT_PUBLIC_SITE_URL production   # your real domain, once attached
vercel --prod
```

Repeat `vercel env add ... preview` and `... development` for the same
variables if you want preview deployments and `vercel dev` to work with
real values (use the same Supabase project for previews, or create a
second free Supabase project for staging).

`vercel.json` already configures the news-aggregation Cron
(`/api/cron/aggregate-news`, every 6 hours) — Vercel Cron works
automatically on Hobby/Pro once deployed; no extra setup needed beyond the
`CRON_SECRET` env var matching what the route checks.

## 8. Attach your domain

Vercel dashboard → your project → Settings → Domains → add
`kalanilavaram.com` (or whatever you've registered) and follow the DNS
instructions Vercel gives you. Update `NEXT_PUBLIC_SITE_URL` and Supabase's
Auth → URL Configuration → Site URL to match once the domain is live, then
redeploy.

## 9. First tenant + first Super Admin, in production

1. Sign up on the live site.
2. Promote yourself via the Supabase SQL editor (same `insert into
   platform_admins ...` as step 6, against the production project).
3. Approve your first school's tenant request (self-serve flow at
   `/schools/new`), or insert one directly:
   ```sql
   update tenants set status = 'active' where slug = 'your-school-slug';
   ```
4. Create the first Editor/Moderator memberships for trusted team members
   via the Supabase dashboard's table editor (Phase 1 has no in-app "assign
   role" UI yet — add this as an early Phase 2 admin tool if the team
   grows past a couple of schools).

## 10. Add rate limiting / CAPTCHA to the whistleblower form

Not yet wired in code (Section 5 calls for it explicitly). Fastest path:
add [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) or
Vercel's built-in Bot Protection in front of
`app/school/[slug]/whistleblower/actions.ts`'s `submitWhistleblowerReport`
before launch — do this before real users touch the form, not after.
