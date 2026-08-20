/**
 * ============================================================================
 * FILE: apps/web/lib/rate-limit.ts
 * PURPOSE: Pure, framework-free rate-limit primitives shared by server actions.
 *          Kept free of Supabase/Next.js imports so the rolling-window math can
 *          be unit tested in isolation (see lib/rate-limit.test.ts).
 *
 * IDENTIFIERS & SYMBOLS:
 * - RateLimitConfig (Type): { maxPerPeriod, periodMs } window definition.
 * - REVIEW_RATE_LIMIT (Constant): 1 review per tenant per 30 days (Section 4D).
 * - isWithinPeriod (Function): Whether a timestamp falls inside a rolling window.
 * - withinRateLimit (Function): Whether an observed count is under the limit.
 *
 * RELATION TO APP:
 * - Enforces anti-brigading limits for reviews (apps/web/app/school/[slug]/reviews/actions.ts).
 * ============================================================================
 */

export interface RateLimitConfig {
  maxPerPeriod: number;
  periodMs: number;
}

/** Rolling 30-day review window: at most one review per user per tenant. */
export const REVIEW_RATE_LIMIT: RateLimitConfig = {
  maxPerPeriod: 1,
  periodMs: 30 * 24 * 60 * 60 * 1000
};

/** Returns true when `createdAt` is within `periodMs` before `now`. */
export function isWithinPeriod(createdAt: string | Date, now: Date, periodMs: number): boolean {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= periodMs;
}

/** Returns true when the number of records inside the window is under the cap. */
export function withinRateLimit(countInPeriod: number, maxPerPeriod: number): boolean {
  return countInPeriod < maxPerPeriod;
}

/** Convenience: ISO timestamp marking the start of the rolling window. */
export function windowStart(now: Date, periodMs: number): string {
  return new Date(now.getTime() - periodMs).toISOString();
}