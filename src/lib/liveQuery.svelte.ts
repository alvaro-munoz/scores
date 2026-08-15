import { liveQuery } from 'dexie';

/**
 * Wraps a Dexie liveQuery in a Svelte 5 rune so components can read `.value`
 * reactively. Must be called during component initialization (like other runes).
 */
export function liveQueryState<T>(querierFn: () => Promise<T> | T, initial: T) {
  let value = $state<T>(initial);

  $effect(() => {
    const subscription = liveQuery(querierFn).subscribe({
      next: (v) => {
        value = v;
      },
      error: (err) => console.error('liveQuery error', err),
    });
    return () => subscription.unsubscribe();
  });

  return {
    get value() {
      return value;
    },
  };
}
