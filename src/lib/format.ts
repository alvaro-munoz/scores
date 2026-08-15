const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
  style: 'short',
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** e.g. "Aug 15" — locale-aware, no year (used for anything recent enough to matter). */
export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * "5m ago", "3h ago", "yesterday", etc. for anything within the last week;
 * falls back to a plain date (formatDate) beyond that, since "12d ago" stops
 * being a useful at-a-glance unit.
 */
export function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  if (diffMs >= WEEK_MS) return formatDate(ts);

  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return relativeTimeFormatter.format(-diffSec, 'second');
  if (diffMin < 60) return relativeTimeFormatter.format(-diffMin, 'minute');
  if (diffHour < 24) return relativeTimeFormatter.format(-diffHour, 'hour');
  return relativeTimeFormatter.format(-diffDay, 'day');
}
