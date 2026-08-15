<script lang="ts">
  import Router, { push, router } from 'svelte-spa-router';
  import { ArrowLeft, Spade } from '@lucide/svelte';
  import { Toast } from '@skeletonlabs/skeleton-svelte';
  import { toaster } from './lib/toaster';
  import { pwa } from './lib/pwa.svelte';
  import Home from './routes/Home.svelte';
  import NewGame from './routes/NewGame.svelte';
  import GamePlay from './routes/GamePlay.svelte';
  import Scoreboard from './routes/Scoreboard.svelte';

  const routes = {
    '/': Home,
    '/new': NewGame,
    '/game/:id': GamePlay,
    '/game/:id/summary': Scoreboard,
  };

  const isHome = $derived(router.location === '/');

  $effect(() => {
    if (pwa.needRefresh) {
      toaster.create({
        title: 'Update available',
        description: 'A new version of Scores is ready.',
        duration: Number.POSITIVE_INFINITY,
        action: { label: 'Reload', onClick: () => pwa.reload() },
      });
    }
  });

  $effect(() => {
    if (pwa.offlineReady) {
      toaster.success({ title: 'Ready to work offline', description: 'Scores is installed and cached.' });
      pwa.dismissOfflineReady();
    }
  });
</script>

<div class="mx-auto flex min-h-svh max-w-2xl flex-col">
  <header
    class="sticky top-0 z-10 flex items-center gap-2 border-b border-surface-200-800 bg-surface-50-950/90 px-4 py-3 backdrop-blur"
    style="padding-top: max(0.75rem, env(safe-area-inset-top));"
  >
    {#if !isHome}
      <button
        type="button"
        class="btn-icon preset-tonal"
        aria-label="Back to games"
        onclick={() => push('/')}
      >
        <ArrowLeft size={20} />
      </button>
    {:else}
      <Spade size={22} class="text-primary-500" />
    {/if}
    <h1 class="text-lg font-bold tracking-tight">Scores</h1>
  </header>

  <main class="flex-1 px-4 py-4" style="padding-bottom: max(1rem, env(safe-area-inset-bottom));">
    <Router {routes} />
  </main>
</div>

<Toast.Group {toaster}>
  {#snippet children(toast)}
    <Toast {toast}>
      <Toast.Message>
        <Toast.Title>{toast.title}</Toast.Title>
        {#if toast.description}
          <Toast.Description>{toast.description}</Toast.Description>
        {/if}
      </Toast.Message>
      {#if toast.action}
        <Toast.ActionTrigger class="btn btn-sm preset-tonal">{toast.action.label}</Toast.ActionTrigger>
      {/if}
      <Toast.CloseTrigger />
    </Toast>
  {/snippet}
</Toast.Group>
