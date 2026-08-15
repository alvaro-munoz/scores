import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDate, formatRelative } from './format';

// Assertions are computed via the same Intl APIs the implementation uses
// (with the same "undefined = follow the system locale" behavior) rather
// than hardcoded English strings, since format.ts is explicitly
// locale-aware — see architecture.md. This tests the threshold logic
// (which unit is chosen, and the one-week cutoff), not literal wording.
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

describe('formatDate', () => {
  it('formats a timestamp as month + day, matching toLocaleDateString', () => {
    const ts = new Date('2026-08-15T12:00:00Z').getTime();
    expect(formatDate(ts)).toBe(
      new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    );
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-08-15T12:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses seconds under a minute', () => {
    expect(formatRelative(now - 30_000)).toBe(rtf.format(-30, 'second'));
  });

  it('uses minutes under an hour', () => {
    expect(formatRelative(now - 5 * 60_000)).toBe(rtf.format(-5, 'minute'));
  });

  it('uses hours under a day', () => {
    expect(formatRelative(now - 3 * 60 * 60_000)).toBe(rtf.format(-3, 'hour'));
  });

  it('uses days under a week', () => {
    expect(formatRelative(now - 3 * 24 * 60 * 60_000)).toBe(rtf.format(-3, 'day'));
  });

  it('falls back to a plain date at exactly one week', () => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    expect(formatRelative(now - weekMs)).toBe(formatDate(now - weekMs));
  });

  it('falls back to a plain date well beyond a week', () => {
    const ts = now - 30 * 24 * 60 * 60 * 1000;
    expect(formatRelative(ts)).toBe(formatDate(ts));
  });

  it('does not fall back just under one week', () => {
    // Not asserting an exact day count here: the second->minute->hour->day
    // rounding cascade can round a delta just under a week back up to "7",
    // which would make an exact-count assertion fragile. What actually
    // matters at this boundary is that it took the relative-time branch
    // rather than the formatDate fallback.
    const justUnderWeek = now - (7 * 24 * 60 * 60 * 1000 - 1000);
    expect(formatRelative(justUnderWeek)).not.toBe(formatDate(justUnderWeek));
  });
});
