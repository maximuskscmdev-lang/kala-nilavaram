/**
 * ============================================================================
 * FILE: apps/web/lib/supabase/client.ts
 * PURPOSE: Browser-side Supabase client singleton factory. Utilizes the public
 *          anon key for client queries, relying on PostgreSQL Row Level Security (RLS)
 *          to isolate multi-tenant data.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - DEFAULT_SUPABASE_URL (string): Fallback URL for development.
 * - DEFAULT_ANON_KEY (string): Fallback key for development.
 * - createClient (Function): Instantiates and returns a browser Supabase client.
 * 
 * RELATION TO APP:
 * - Client-side auth state listeners and interactive user interactions.
 * ============================================================================
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/config';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
