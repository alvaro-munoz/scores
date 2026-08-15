import { createToaster } from '@skeletonlabs/skeleton-svelte';

export const toaster = createToaster({
  placement: 'top-end',
  offsets: { top: 'max(4.5rem, calc(env(safe-area-inset-top) + 4rem))', right: '1rem', left: '1rem', bottom: '1rem' },
});
