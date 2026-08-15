<script lang="ts">
  import { replace } from 'svelte-spa-router';
  import { Plus, Crown, FlagTriangleRight, Pencil } from '@lucide/svelte';
  import { db, computeTotals, addRound, updateRound, deleteRound, finishGame } from '../lib/db';
  import { liveQueryState } from '../lib/liveQuery.svelte';
  import { toaster } from '../lib/toaster';
  import RoundFormDialog from '../lib/components/RoundFormDialog.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import type { Round } from '../lib/types';

  interface Props {
    params: { id: string };
  }
  const { params }: Props = $props();
  const gameId = $derived(Number(params.id));

  const game = liveQueryState(() => db.games.get(gameId), undefined);
  const rounds = liveQueryState(
    () => db.rounds.where('gameId').equals(gameId).sortBy('index'),
    [] as Round[],
  );

  const totals = $derived(game.value ? computeTotals(game.value, rounds.value) : []);
  const standings = $derived([...totals].sort((a, b) => a.rank - b.rank));

  let addOpen = $state(false);
  let editingRound = $state<Round | null>(null);
  let finishOpen = $state(false);

  async function handleAddRound(scores: Record<string, number>) {
    await addRound(gameId, scores);
  }

  async function handleEditRound(scores: Record<string, number>) {
    if (!editingRound?.id) return;
    await updateRound(editingRound.id, scores);
    editingRound = null;
  }

  async function handleDeleteRound() {
    if (!editingRound?.id) return;
    await deleteRound(editingRound.id);
    editingRound = null;
    toaster.success({ title: 'Round deleted' });
  }

  async function handleFinish() {
    await finishGame(gameId);
    replace(`/game/${gameId}/summary`);
  }
</script>

{#if !game.value}
  <p class="py-10 text-center opacity-60">Loading game…</p>
{:else}
  <div class="space-y-5 pb-28">
    <header class="space-y-1">
      <h2 class="text-xl font-bold">{game.value.name}</h2>
      <p class="text-sm opacity-60">
        {game.value.winCondition === 'highest' ? 'Most points wins' : 'Fewest points wins'} ·
        {rounds.value.length} round{rounds.value.length === 1 ? '' : 's'}
      </p>
    </header>

    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {#each standings as t (t.player.id)}
        <div
          class="card preset-tonal flex min-w-[7rem] shrink-0 flex-col items-center gap-0.5 px-3 py-2 {t.rank === 1
            ? 'preset-tonal-warning'
            : ''}"
        >
          <div class="flex items-center gap-1 text-xs font-medium opacity-70">
            {#if t.rank === 1}<Crown size={14} class="text-warning-500" />{/if}
            {t.player.name}
          </div>
          <div class="text-xl font-bold tabular-nums">{t.total}</div>
        </div>
      {/each}
    </div>

    {#if rounds.value.length === 0}
      <div class="flex flex-col items-center gap-3 py-14 text-center">
        <p class="max-w-xs text-sm opacity-60">
          No rounds yet. Add the first round to start tracking scores.
        </p>
      </div>
    {:else}
      <ol class="space-y-2">
        {#each rounds.value as round (round.id)}
          <li>
            <button
              type="button"
              class="card preset-filled-surface-100-900 flex w-full flex-wrap items-center gap-x-3 gap-y-1 border border-surface-200-800 p-3 text-left"
              onclick={() => (editingRound = round)}
            >
              <span class="flex w-14 shrink-0 items-center gap-1 text-sm font-semibold opacity-60">
                <Pencil size={12} /> #{round.index}
              </span>
              <span class="flex flex-1 flex-wrap gap-x-3 gap-y-1 text-sm">
                {#each game.value.players as player (player.id)}
                  <span class="tabular-nums">
                    <span class="opacity-60">{player.name}</span>
                    <span class="font-semibold">{round.scores[player.id] ?? 0}</span>
                  </span>
                {/each}
              </span>
            </button>
          </li>
        {/each}
      </ol>
    {/if}
  </div>

  <div
    class="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl gap-2 border-t border-surface-200-800 bg-surface-50-950/95 px-4 py-3 backdrop-blur"
    style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
  >
    <button type="button" class="btn preset-tonal flex-1" onclick={() => (finishOpen = true)}>
      <FlagTriangleRight size={18} />
      Finish game
    </button>
    <button type="button" class="btn preset-filled-primary flex-[2]" onclick={() => (addOpen = true)}>
      <Plus size={18} />
      Add round
    </button>
  </div>

  <RoundFormDialog
    open={addOpen}
    title={`Round ${rounds.value.length + 1}`}
    players={game.value.players}
    onOpenChange={(o) => (addOpen = o)}
    onSave={handleAddRound}
  />

  <RoundFormDialog
    open={editingRound !== null}
    title={`Edit round ${editingRound?.index ?? ''}`}
    players={game.value.players}
    initialScores={editingRound?.scores}
    onOpenChange={(o) => !o && (editingRound = null)}
    onSave={handleEditRound}
    extraAction={{ label: 'Delete round', onClick: handleDeleteRound }}
  />

  <ConfirmDialog
    open={finishOpen}
    onOpenChange={(o) => (finishOpen = o)}
    title="Finish game?"
    description={standings[0]
      ? `${standings[0].player.name} is currently ${game.value.winCondition === 'highest' ? 'leading' : 'in the lead'} with ${standings[0].total} points. You can't add more rounds after finishing.`
      : "You can't add more rounds after finishing."}
    confirmLabel="Finish game"
    danger={false}
    onConfirm={handleFinish}
  />
{/if}
