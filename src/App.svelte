<script lang="ts">
  import { House, Spade } from '@lucide/svelte';
  import { Toast } from '@skeletonlabs/skeleton-svelte';
  import { toaster } from './lib/toaster';
  import { pwa } from './lib/pwa.svelte';
  import Home from './views/Home.svelte';
  import NewGame from './views/NewGame.svelte';
  import GamePlay from './views/GamePlay.svelte';
  import Scoreboard from './views/Scoreboard.svelte';

  // The app is small enough that a single view-state variable is simpler
  // than a router: no URLs to keep in sync, no route-matching, just "what's
  // on screen right now".
  type View =
    | { name: 'home' }
    | { name: 'new' }
    | { name: 'game'; gameId: number }
    | { name: 'summary'; gameId: number };

  let view = $state<View>({ name: 'home' });

  const isHome = $derived(view.name === 'home');

  function goHome() {
    view = { name: 'home' };
  }
  function goNew() {
    view = { name: 'new' };
  }
  function goGame(gameId: number) {
    view = { name: 'game', gameId };
  }
  function goSummary(gameId: number) {
    view = { name: 'summary', gameId };
  }

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
</script>

<div class="mx-auto flex min-h-svh max-w-2xl flex-col">
  <header
    class="border-surface-200-800 bg-surface-50-950/90 sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3 backdrop-blur"
    style="padding-top: max(0.75rem, env(safe-area-inset-top));"
  >
    {#if !isHome}
      <button type="button" class="btn-icon preset-tonal" aria-label="Home" onclick={goHome}>
        <House size={20} />
      </button>
    {:else}
      <Spade size={22} class="text-primary-500" />
    {/if}
    <h1 class="text-lg font-bold tracking-tight">Scores</h1>
  </header>

  <main class="flex-1 px-4 py-4" style="padding-bottom: max(1rem, env(safe-area-inset-bottom));">
    {#if view.name === 'home'}
      <Home onNewGame={goNew} onOpenGame={goGame} onOpenSummary={goSummary} />
    {:else if view.name === 'new'}
      <NewGame onCreated={goGame} />
    {:else if view.name === 'game'}
      <GamePlay gameId={view.gameId} onFinish={goSummary} />
    {:else if view.name === 'summary'}
      <Scoreboard gameId={view.gameId} onReopen={goGame} onNewGame={goNew} onHome={goHome} />
    {/if}
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
        <Toast.ActionTrigger class="btn btn-sm preset-tonal"
          >{toast.action.label}</Toast.ActionTrigger
        >
      {/if}
      <Toast.CloseTrigger />
    </Toast>
  {/snippet}
</Toast.Group>
