/**
 * ============================================================================
 * FILE: apps/web/middleware.ts
 * PURPOSE: Edge middleware for session cookie synchronization and enforcing security
 *          headers (noindex, nofollow, no-store) on whistleblower complaint routes.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - DEFAULT_SUPABASE_URL (string): Fallback URL for development.
 * - DEFAULT_ANON_KEY (string): Fallback anon key for development.
 * - middleware (Async Function): Executes before every matched route, refreshing
 *   Supabase user tokens and attaching strict search-engine blocking headers.
 * - config (Object): Route matcher excluding static assets, favicon, manifest, and icons.
 * 
 * RELATION TO APP:
 * - Protects student privacy by guaranteeing search engines never index or cache
 *   sensitive whistleblower report paths per Section 5.
 * ============================================================================
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/config';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        }
      }
    }
  );

  try {
    await supabase.auth.getUser();
  } catch {
    // Ignore auth lookup errors during offline/dev mode
  }

  if (request.nextUrl.pathname.includes('/whistleblower')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    // Keep the secret tracking ID out of Referer headers / logs when the user
    // clicks onward from the confirmation/track page (bug #22).
    response.headers.set('Referrer-Policy', 'no-referrer');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|logo.png|sw.js).*)']
};
