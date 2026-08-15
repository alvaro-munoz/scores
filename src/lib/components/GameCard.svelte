<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Trash2, Users, Crown } from '@lucide/svelte';
  import { db, computeTotals } from '../db';
  import { liveQueryState } from '../liveQuery.svelte';
  import type { Game } from '../types';

  interface Props {
    game: Game;
    onRequestDelete: (game: Game) => void;
  }
  const { game, onRequestDelete }: Props = $props();

  const rounds = liveQueryState(
    () => db.rounds.where('gameId').equals(game.id!).sortBy('index'),
    [],
  );
  const totals = $derived(computeTotals(game, rounds.value));
  const leader = $derived([...totals].sort((a, b) => a.rank - b.rank)[0]);

  function open() {
    push(game.status === 'finished' ? `/game/${game.id}/summary` : `/game/${game.id}`);
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<div
  class="card preset-filled-surface-100-900 border-surface-200-800 space-y-3 border p-4 text-left transition active:scale-[0.99]"
  role="button"
  tabindex="0"
  onclick={open}
  onkeydown={(e) => e.key === 'Enter' && open()}
>
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <h2 class="truncate leading-tight font-semibold">{game.name}</h2>
      <p class="mt-0.5 flex items-center gap-1 text-xs opacity-60">
        <Users size={14} />
        {game.players.length} players · {formatDate(game.createdAt)}
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      {#if game.status === 'active'}
        <span class="badge preset-tonal-primary">Active</span>
      {:else}
        <span class="badge preset-tonal-success">Finished</span>
      {/if}
      <button
        type="button"
        class="btn-icon btn-icon-sm hover:preset-tonal-error"
        aria-label="Delete game"
        onclick={(e) => {
          e.stopPropagation();
          onRequestDelete(game);
        }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>

  {#if rounds.value.length > 0 && leader}
    <div class="flex items-center gap-1.5 text-sm">
      <Crown size={16} class="text-warning-500" />
      <span class="font-medium">{leader.player.name}</span>
      <span class="opacity-60">
        {game.status === 'finished' ? 'won with' : 'leads with'}
        {leader.total}
      </span>
    </div>
  {:else}
    <p class="text-sm opacity-50">No rounds yet</p>
  {/if}
</div>
