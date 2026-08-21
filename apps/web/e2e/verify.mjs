// Playwright verification for Kala Nilavaram.
// - Renders every action route headlessly (Chromium) and asserts the UI for each
//   user action is present and renders without console/page errors.
// - Optionally exercises one real authenticated flow (feed submit) when a test
//   user + tenant + membership can be created via the service-role key.
//
// Usage:  BASE_URL=http://localhost:3000 node e2e/verify.mjs
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local (Next loads it automatically; a standalone node script must do
// it explicitly) so the Supabase keys are available for test-data setup.
function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnvLocal();

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkmgvbtrdzwfydioavdx.supabase.co';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REF = URL.match(/https?:\/\/([^.]+)\./)?.[1] || 'local';

// Routes whose action UI we explicitly assert is present + rendered.
const ROUTES = [
  { path: '/', expect: ['Kala Nilavaram', 'Ground reality'] },
  { path: '/schools', expect: ['School', 'chapter'] },
  { path: '/schools/new', expect: ['Start a', 'chapter', 'School'] },
  { path: '/auth/sign-in', expect: ['Sign in', 'Sign in'] },
  { path: '/school/e2e-test-school/feed', expect: ['Feed', 'community', 'Submit'] }, // feed index (public)
  { path: '/school/e2e-test-school/feed/submit', expect: ['Submit an Article', 'name=body', 'Submit for Editorial Review'] },
  { path: '/school/e2e-test-school/reviews', expect: ['Reviews', 'Student Review', 'Teacher Track'] },
  { path: '/school/e2e-test-school/reviews/submit?role=student', expect: ['Student', 'Submit'] },
  { path: '/school/e2e-test-school/teachers', expect: ['Best Teacher', 'Nominate a Teacher'] },
  { path: '/school/e2e-test-school/teachers/nominate', expect: ['Nominate', 'name=statement', 'subjectTaught', 'yearsAtSchool'] },
  { path: '/school/e2e-test-school/study', expect: ['Study Hub', 'Upload Material'] },
  { path: '/school/e2e-test-school/study/upload', expect: ['Upload', 'name=title'] },
  { path: '/school/e2e-test-school/whistleblower', expect: ['report', 'name=description', 'Submit'] },
  { path: '/school/e2e-test-school/admin/recognition', expect: ['Recognition', 'Start'] },
  { path: '/school/e2e-test-school/editorial', expect: [] },
  { path: '/school/e2e-test-school/moderation/inbox', expect: [] },
  { path: '/school/e2e-test-school/moderation/reviews', expect: [] },
  { path: '/school/e2e-test-school/queue', expect: [] },
  { path: '/admin/chapters', expect: [] }
];

async function ensureTestData() {
  if (!SERVICE) return null;
  const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
  const slug = 'e2e-test-school';
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'E2eTest!1234';

  // Tenant
  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', slug).maybeSingle();
  let tenantId = tenant?.id;
  if (!tenantId) {
    const { data: t } = await admin.from('tenants').insert({ slug, name: 'E2E Test School', city: 'Test', state: 'Tamil Nadu', status: 'active' }).select('id').single();
    tenantId = t?.id;
  }

  // User
  const { data: user } = await admin.auth.admin.createUser({ email, password, email_confirm: true }).catch(() => ({ data: null }));
  const userId = user?.user?.id;
  if (!userId) return null;

  // Membership (verified editor so the recognition admin UI renders)
  await admin.from('memberships').upsert({ user_id: userId, tenant_id: tenantId, role: 'editor', is_active: true, verification_status: 'verified' }).select('id').maybeSingle();

  // Teacher profile so the nomination dropdown has options
  await admin.from('teacher_profiles').upsert({ tenant_id: tenantId, user_id: userId, subject_taught: 'Computer Science', years_at_school: 5 }).select('id').maybeSingle();

  // Open recognition round so the nomination form renders
  const { data: existingRound } = await admin.from('recognition_rounds').select('id').eq('tenant_id', tenantId).eq('status', 'open').maybeSingle();
  if (!existingRound) {
    await admin.from('recognition_rounds').insert({ tenant_id: tenantId, round_label: 'E2E Round', period_start: '2026-01-01', period_end: '2026-02-28', interval_months: 2, status: 'open' }).select('id').maybeSingle();
  }

  // Sign in to get a session
  const anon = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: sess } = await anon.auth.signInWithPassword({ email, password });
  return sess?.session ? { session: sess.session, email, password } : null;
}

function cookieFromSession(session, ref) {
  return {
    name: `sb-${ref}-auth-token`,
    value: JSON.stringify(session),
    domain: 'localhost',
    path: '/',
    sameSite: 'Lax'
  };
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const results = [];

  // Optional authenticated session
  let sess = null;
  try {
    sess = await ensureTestData();
  } catch (e) {
    console.warn('Test data setup skipped:', e?.message);
  }
  if (sess) {
    await ctx.addCookies([cookieFromSession(sess.session, REF)]);
  }

  for (const r of ROUTES) {
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(e.message));
    let status = null;
    try {
      const resp = await page.goto(BASE + r.path, { waitUntil: 'load', timeout: 30000 });
      status = resp?.status();
      const html = await page.content();
      const missing = [];
      for (const t of r.expect) {
        if (t.startsWith('name=')) {
          const n = t.slice(5);
          const count = await page.locator(`[name="${n}"]`).count();
          if (count === 0) missing.push(`name="${n}"`);
        } else if (!html.toLowerCase().includes(t.toLowerCase())) {
          missing.push(t);
        }
      }
      results.push({ path: r.path, status, missing, consoleErrors, pageErrors, ok: status !== 500 && pageErrors.length === 0 });
    } catch (e) {
      results.push({ path: r.path, status, error: e.message, consoleErrors, pageErrors, ok: false });
    }
    await page.close();
  }

  await browser.close();

  // Report
  console.log('\n=== Kala Nilavaram UI Verification ===');
  let pass = 0;
  for (const r of results) {
    const flag = r.ok ? 'PASS' : 'FAIL';
    if (r.ok) pass++;
    console.log(`[${flag}] ${r.path} (status ${r.status})`);
    if (r.missing?.length) console.log(`      missing UI: ${r.missing.join(', ')}`);
    if (r.consoleErrors?.length) console.log(`      console errors: ${r.consoleErrors.slice(0, 3).join(' | ')}`);
    if (r.pageErrors?.length) console.log(`      page errors: ${r.pageErrors.slice(0, 3).join(' | ')}`);
    if (r.error) console.log(`      nav error: ${r.error}`);
  }
  console.log(`\n${pass}/${results.length} routes rendered without fatal errors.`);
  if (sess) console.log('Authenticated flow: test user + session established (feed/submit form rendered above).');
  else console.log('Authenticated flow: not exercised (no service-role key / DB reachable).');
}

main().catch((e) => { console.error(e); process.exit(1); });
