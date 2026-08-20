import { describe, expect, it } from 'vitest';
import {
  REVIEW_RATE_LIMIT,
  isWithinPeriod,
  windowStart,
  withinRateLimit
} from './rate-limit';

const NOW = new Date('2026-08-16T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('isWithinPeriod', () => {
  it('returns true for timestamps inside the rolling window', () => {
    const recent = new Date(NOW.getTime() - 5 * DAY);
    expect(isWithinPeriod(recent.toISOString(), NOW, REVIEW_RATE_LIMIT.periodMs)).toBe(true);
  });

  it('returns false for timestamps older than the window', () => {
    const old = new Date(NOW.getTime() - 31 * DAY);
    expect(isWithinPeriod(old.toISOString(), NOW, REVIEW_RATE_LIMIT.periodMs)).toBe(false);
  });

  it('is inclusive at the exact window boundary', () => {
    const boundary = new Date(NOW.getTime() - REVIEW_RATE_LIMIT.periodMs);
    expect(isWithinPeriod(boundary, NOW, REVIEW_RATE_LIMIT.periodMs)).toBe(true);
  });

  it('returns false for invalid dates', () => {
    expect(isWithinPeriod('not-a-date', NOW, REVIEW_RATE_LIMIT.periodMs)).toBe(false);
  });

  it('accepts Date objects as well as ISO strings', () => {
    expect(isWithinPeriod(new Date(NOW.getTime() - DAY), NOW, REVIEW_RATE_LIMIT.periodMs)).toBe(true);
  });
});

describe('withinRateLimit', () => {
  it('allows counts strictly below the cap', () => {
    expect(withinRateLimit(0, REVIEW_RATE_LIMIT.maxPerPeriod)).toBe(true);
  });

  it('rejects counts at or above the cap', () => {
    expect(withinRateLimit(1, REVIEW_RATE_LIMIT.maxPerPeriod)).toBe(false);
    expect(withinRateLimit(2, REVIEW_RATE_LIMIT.maxPerPeriod)).toBe(false);
  });
});

describe('windowStart', () => {
  it('returns an ISO string exactly periodMs before now', () => {
    const expected = new Date(NOW.getTime() - REVIEW_RATE_LIMIT.periodMs).toISOString();
    expect(windowStart(NOW, REVIEW_RATE_LIMIT.periodMs)).toBe(expected);
  });
});

describe('REVIEW_RATE_LIMIT', () => {
  it('is configured to one review per 30 days', () => {
    expect(REVIEW_RATE_LIMIT.maxPerPeriod).toBe(1);
    expect(REVIEW_RATE_LIMIT.periodMs).toBe(30 * DAY);
  });
});