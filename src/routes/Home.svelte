<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Plus, Spade, Download, X } from '@lucide/svelte';
  import { db, deleteGame } from '../lib/db';
  import { liveQueryState } from '../lib/liveQuery.svelte';
  import { toaster } from '../lib/toaster';
  import { pwa } from '../lib/pwa.svelte';
  import GameCard from '../lib/components/GameCard.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import type { Game } from '../lib/types';

  let installBannerDismissed = $state(false);

  const games = liveQueryState(
    () => db.games.orderBy('createdAt').reverse().toArray(),
    [] as Game[],
  );

  const active = $derived(games.value.filter((g) => g.status === 'active'));
  const finished = $derived(games.value.filter((g) => g.status === 'finished'));

  let gameToDelete = $state<Game | null>(null);

  async function confirmDelete() {
    const game = gameToDelete;
    if (!game?.id) return;
    await deleteGame(game.id);
    toaster.success({ title: `Deleted "${game.name}"` });
  }
</script>

<div class="space-y-6 pb-24">
  {#if pwa.canInstall && !installBannerDismissed}
    <div class="card preset-tonal-primary flex items-center gap-3 p-3">
      <Download size={20} class="shrink-0" />
      <div class="flex-1 text-sm">
        <p class="font-medium">Install Scores</p>
        <p class="opacity-70">Add it to your home screen for quick, offline access.</p>
      </div>
      <button type="button" class="btn btn-sm preset-filled-primary" onclick={() => pwa.install()}>
        Install
      </button>
      <button
        type="button"
        class="btn-icon btn-icon-sm hover:preset-tonal"
        aria-label="Dismiss"
        onclick={() => (installBannerDismissed = true)}
      >
        <X size={16} />
      </button>
    </div>
  {/if}

  {#if games.value.length === 0}
    <div class="flex flex-col items-center gap-3 py-20 text-center">
      <Spade size={40} class="opacity-40" />
      <h2 class="text-lg font-semibold">No games yet</h2>
      <p class="max-w-xs text-sm opacity-60">
        Start a new game to track scores round by round with your friends.
      </p>
      <button type="button" class="btn preset-filled-primary mt-2" onclick={() => push('/new')}>
        <Plus size={18} />
        New game
      </button>
    </div>
  {:else}
    {#if active.length > 0}
      <section class="space-y-2">
        <h2 class="text-sm font-semibold tracking-wide uppercase opacity-60">Active games</h2>
        <div class="space-y-2">
          {#each active as game (game.id)}
            <GameCard {game} onRequestDelete={(g) => (gameToDelete = g)} />
          {/each}
        </div>
      </section>
    {/if}

    {#if finished.length > 0}
      <section class="space-y-2">
        <h2 class="text-sm font-semibold tracking-wide uppercase opacity-60">Finished games</h2>
        <div class="space-y-2">
          {#each finished as game (game.id)}
            <GameCard {game} onRequestDelete={(g) => (gameToDelete = g)} />
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

{#if games.value.length > 0}
  <button
    type="button"
    class="btn-icon preset-filled-primary fixed right-5 bottom-5 z-20 size-14 rounded-full shadow-xl"
    style="bottom: max(1.25rem, calc(env(safe-area-inset-bottom) + 1rem));"
    aria-label="New game"
    onclick={() => push('/new')}
  >
    <Plus size={24} />
  </button>
{/if}

<ConfirmDialog
  open={gameToDelete !== null}
  onOpenChange={(o) => !o && (gameToDelete = null)}
  title="Delete game?"
  description={`This will permanently delete "${gameToDelete?.name ?? ''}" and all its rounds.`}
  confirmLabel="Delete"
  onConfirm={confirmDelete}
/>
