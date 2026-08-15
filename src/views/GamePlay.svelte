<script lang="ts">
  import { Plus, Crown, FlagTriangleRight, Trash2 } from '@lucide/svelte';
  import { db, computeTotals, addRound, updateRound, deleteRound, finishGame } from '../lib/db';
  import { liveQueryState } from '../lib/liveQuery.svelte';
  import { toaster } from '../lib/toaster';
  import type { Round } from '../lib/types';

  interface Props {
    gameId: number;
    onFinish: (gameId: number) => void;
  }
  const { gameId, onFinish }: Props = $props();

  const game = liveQueryState(() => db.games.get(gameId), undefined);

  const players = $derived(game.value?.players ?? []);
  const rounds = $derived(game.value?.rounds ?? []);
  // Newest round first, so the always-visible entry row at the top never
  // needs the round history scrolled out of the way to reach it.
  const roundsDesc = $derived([...rounds].reverse());

  // In player-column order (not sorted by rank) so totals[i] lines up with
  // players[i] as a table column.
  const totals = $derived(game.value ? computeTotals(game.value) : []);

  let draft = $state<Record<string, string>>({});
  let editingRound = $state<Round | null>(null);
  let inputEls: (HTMLInputElement | undefined)[] = [];

  // Seed the draft as soon as the game (and its player list) is available.
  $effect(() => {
    if (game.value && Object.keys(draft).length === 0) resetDraft();
  });

  function resetDraft() {
    if (!game.value) return;
    draft = Object.fromEntries(game.value.players.map((p) => [p.id, '']));
  }

  function startEdit(round: Round) {
    if (!game.value) return;
    editingRound = round;
    draft = Object.fromEntries(
      game.value.players.map((p) => [p.id, String(round.scores[p.id] ?? 0)]),
    );
  }

  function startAdd() {
    editingRound = null;
    resetDraft();
  }

  function handleScoreKeydown(e: KeyboardEvent, index: number) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const next = inputEls[index + 1];
    if (next) {
      next.focus();
      next.select();
    } else {
      submitRound();
    }
  }

  async function submitRound() {
    if (!game.value) return;
    const scores: Record<string, number> = {};
    for (const p of game.value.players) {
      const raw = draft[p.id] ?? '';
      const n = Number(raw);
      scores[p.id] = raw === '' || !Number.isFinite(n) ? 0 : n;
    }
    if (editingRound) {
      await updateRound(gameId, editingRound.index, scores);
      editingRound = null;
    } else {
      await addRound(gameId, scores);
    }
    resetDraft();
    inputEls[0]?.focus();
  }

  async function handleDeleteRound() {
    if (!editingRound) return;
    await deleteRound(gameId, editingRound.index);
    editingRound = null;
    resetDraft();
    toaster.success({ title: 'Round deleted' });
  }

  async function handleFinish() {
    await finishGame(gameId);
    onFinish(gameId);
  }
</script>

{#if !game.value}
  <p class="py-10 text-center opacity-60">Loading game…</p>
{:else}
  <div class="space-y-4 pb-24">
    <header class="space-y-1">
      <h2 class="text-xl font-bold">{game.value.name}</h2>
      <p class="text-sm opacity-60">
        {game.value.winCondition === 'highest' ? 'Most points wins' : 'Fewest points wins'} ·
        {rounds.length} round{rounds.length === 1 ? '' : 's'}
      </p>
    </header>

    <!-- Standings, round history, and score entry all live in one compact
         grid: player totals up top, an always-editable row for the next
         round right below, then past rounds — tap one to edit it in place.
         A CSS grid (not a <table>) is used so the frozen first column keeps
         its stacking above content scrolling underneath it — sticky <td>s
         are unreliable about that across browsers. -->
    <div class="card preset-filled-surface-100-900 border-surface-200-800 overflow-x-auto border">
      <div
        class="grid text-sm"
        style="grid-template-columns: 2.25rem repeat({players.length}, minmax(4rem, 1fr));"
      >
        <div
          class="preset-filled-surface-100-900 border-surface-200-800 sticky left-0 z-10 border-b px-2 py-2"
        ></div>
        {#each players as player (player.id)}
          <div
            class="border-surface-200-800 truncate border-b px-2 py-2 text-center text-xs font-semibold"
          >
            {player.name}
          </div>
        {/each}

        <div
          class="preset-filled-surface-100-900 border-surface-200-800 sticky left-0 z-10 border-b-2 px-2 py-2 text-xs font-bold opacity-60"
        >
          Tot
        </div>
        {#each players as player, i (player.id)}
          {@const t = totals[i]}
          <div
            class="border-surface-200-800 border-b-2 px-2 py-2 text-center text-sm font-bold tabular-nums {t?.rank ===
            1
              ? 'text-warning-500'
              : ''}"
          >
            {#if t?.rank === 1}<Crown size={12} class="mr-0.5 inline align-text-top" />{/if}
            {t?.total ?? 0}
          </div>
        {/each}

        {#if editingRound === null}
          <div
            class="preset-tonal-primary border-surface-200-800 sticky left-0 z-10 flex items-center border-b px-2 py-1.5 text-xs font-semibold"
          >
            {rounds.length + 1}
          </div>
          {#each players as player, i (player.id)}
            <div class="preset-tonal-primary border-surface-200-800 border-b px-1 py-1">
              <input
                type="number"
                inputmode="numeric"
                class="input w-full px-1 py-1 text-center text-sm"
                placeholder="0"
                bind:value={draft[player.id]}
                bind:this={inputEls[i]}
                onkeydown={(e) => handleScoreKeydown(e, i)}
                onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
              />
            </div>
          {/each}
        {/if}

        {#each roundsDesc as round (round.index)}
          {#if editingRound?.index === round.index}
            <div
              class="preset-tonal-primary border-surface-200-800 sticky left-0 z-10 flex items-center border-b px-2 py-1.5 text-xs font-semibold"
            >
              {round.index}
            </div>
            {#each players as player, i (player.id)}
              <div class="preset-tonal-primary border-surface-200-800 border-b px-1 py-1">
                <input
                  type="number"
                  inputmode="numeric"
                  class="input w-full px-1 py-1 text-center text-sm"
                  placeholder="0"
                  bind:value={draft[player.id]}
                  bind:this={inputEls[i]}
                  onkeydown={(e) => handleScoreKeydown(e, i)}
                  onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                />
              </div>
            {/each}
          {:else}
            <div
              class="preset-filled-surface-100-900 border-surface-200-800 hover:bg-surface-200-800/30 sticky left-0 z-10 flex items-center border-b px-2 py-1.5 text-xs opacity-60"
              role="button"
              tabindex="0"
              onclick={() => startEdit(round)}
              onkeydown={(e) => e.key === 'Enter' && startEdit(round)}
            >
              {round.index}
            </div>
            {#each players as player (player.id)}
              <div
                class="border-surface-200-800 hover:bg-surface-200-800/30 border-b px-2 py-1.5 text-center tabular-nums"
                role="button"
                tabindex="0"
                onclick={() => startEdit(round)}
                onkeydown={(e) => e.key === 'Enter' && startEdit(round)}
              >
                {round.scores[player.id] ?? 0}
              </div>
            {/each}
          {/if}
        {/each}
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if editingRound}
        <button
          type="button"
          class="btn-icon preset-tonal-error"
          aria-label="Delete round"
          onclick={handleDeleteRound}
        >
          <Trash2 size={16} />
        </button>
        <button type="button" class="btn preset-tonal flex-1" onclick={startAdd}>Cancel</button>
        <button type="button" class="btn preset-filled-primary flex-1" onclick={submitRound}>
          Save round
        </button>
      {:else}
        <button type="button" class="btn preset-filled-primary w-full" onclick={submitRound}>
          <Plus size={18} />
          Add round
        </button>
      {/if}
    </div>
  </div>

  <div
    class="border-surface-200-800 bg-surface-50-950/95 fixed inset-x-0 bottom-0 z-10 mx-auto max-w-2xl border-t px-4 py-3 backdrop-blur"
    style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
  >
    <button type="button" class="btn preset-tonal w-full" onclick={handleFinish}>
      <FlagTriangleRight size={18} />
      Finish game
    </button>
  </div>
{/if}
