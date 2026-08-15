// Polyfills IndexedDB for jsdom so Dexie (src/lib/db.ts) works under
// Vitest exactly like it does in a real browser — no mocking of the data
// layer itself.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// jsdom doesn't implement ResizeObserver; Skeleton's Zag-based components
// (e.g. SegmentedControl) use it to size their active-item indicator.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});
