/**
 * ============================================================================
 * FILE: apps/web/lib/supabase/server.ts
 * PURPOSE: Server Component, Server Action, and Route Handler Supabase client factories.
 *          Manages session cookie reading/writing for authenticated user context
 *          and provides the privileged service-role client for background/audited jobs.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - DEFAULT_SUPABASE_URL (string): Fallback URL for development.
 * - DEFAULT_ANON_KEY (string): Fallback anon key for development.
 * - DEFAULT_SERVICE_ROLE_KEY (string): Fallback service role key for development.
 * - createClient (Function): Creates a cookie-aware Server Component / Server Action Supabase client.
 * - createServiceRoleClient (Function): Creates a privileged service-role client bypassing RLS.
 * 
 * RELATION TO APP:
 * - Core backend data access layer powering all Server Actions and Server Components.
 * ============================================================================
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/config';
import type { Database } from './database.types';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component render — safe to ignore because
          // middleware.ts refreshes the session on every request.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // see above
        }
      }
    }
  });
}

export function createServiceRoleClient() {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    cookies: { get: () => undefined, set: () => {}, remove: () => {} }
  });
}
