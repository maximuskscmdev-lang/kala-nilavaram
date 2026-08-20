/**
 * ============================================================================
 * FILE: apps/web/lib/config.ts
 * PURPOSE: Centralized environment configuration. Hardcoded mock values are
 *          only ever used in non-production when NEXT_PUBLIC_ENABLE_DEMO_MODE
 *          is explicitly set to 'true'; otherwise missing variables throw so a
 *          misconfigured production build fails loudly instead of silently
 *          talking to a mock backend.
 *
 * IDENTIFIERS & SYMBOLS:
 * - IS_PRODUCTION (boolean): process.env.NODE_ENV === 'production'.
 * - ENABLE_DEMO_MODE (boolean): NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true'.
 * - getSupabaseUrl / getSupabaseAnonKey (Functions): Resolve Supabase project
 *   credentials with a development-only mock fallback.
 * - getSupabaseServiceRoleKey (Function): Server-only privileged key, throws
 *   outside non-production demo mode.
 * - getWhistleblowerEncryptionKey (Function): Derives the AES-256 key used for
 *   whistleblower contact encryption; development-only fallback.
 * - DEMO_TENANTS (Constant): Fallback school chapters used only in demo mode.
 *
 * RELATION TO APP:
 * - Single source of truth for secrets/fallbacks across server.ts, client.ts,
 *   middleware.ts, encryption.ts, and the landing/directory pages.
 * ============================================================================
 */

const MOCK_SUPABASE_URL = 'https://mock-kalanilavaram.supabase.co';
const MOCK_ANON_KEY = 'mock-anon-key-kalanilavaram';
const MOCK_SERVICE_ROLE_KEY = 'mock-service-role-key-kalanilavaram';
const MOCK_WHISTLEBLOWER_KEY = 'default-kalanilavaram-dev-secret-key-32b';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const ENABLE_DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';

function assertDemoEligible(what: string) {
  if (IS_PRODUCTION || !ENABLE_DEMO_MODE) {
    throw new Error(
      `${what} is not configured. Set it in .env.local (see .env.example). ` +
        (IS_PRODUCTION
          ? 'Mock fallbacks are disabled in production.'
          : 'Mock fallbacks require NEXT_PUBLIC_ENABLE_DEMO_MODE=true.')
    );
  }
}

export function getSupabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (v) return v;
  assertDemoEligible('NEXT_PUBLIC_SUPABASE_URL');
  return MOCK_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (v) return v;
  assertDemoEligible('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return MOCK_ANON_KEY;
}

export function getSupabaseServiceRoleKey(): string {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (v) return v;
  assertDemoEligible('SUPABASE_SERVICE_ROLE_KEY');
  return MOCK_SERVICE_ROLE_KEY;
}

export function getWhistleblowerEncryptionKey(): string {
  const v = process.env.WHISTLEBLOWER_ENCRYPTION_KEY;
  if (v) return v;
  assertDemoEligible('WHISTLEBLOWER_ENCRYPTION_KEY');
  return MOCK_WHISTLEBLOWER_KEY;
}

export interface DemoTenant {
  slug: string;
  name: string;
  city: string;
  state?: string;
  status?: 'pending' | 'active' | 'suspended' | 'rejected';
}

export const DEMO_TENANTS: DemoTenant[] = ENABLE_DEMO_MODE
  ? [
      {
        slug: 'abc-matric-hr-sec',
        name: 'ABC Matriculation Higher Secondary School',
        city: 'Chennai',
        state: 'Tamil Nadu',
        status: 'active'
      },
      {
        slug: 'demo-school',
        name: 'Demo School (Pilot Chapter)',
        city: 'Chennai',
        state: 'Tamil Nadu',
        status: 'active'
      }
    ]
  : [];