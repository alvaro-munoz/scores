<script lang="ts">
  import { Plus, Crown, FlagTriangleRight, Pencil, Trash2, X } from '@lucide/svelte';
  import { db, computeTotals, addRound, updateRound, deleteRound, finishGame } from '../lib/db';
  import { liveQueryState } from '../lib/liveQuery.svelte';
  import { toaster } from '../lib/toaster';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import type { Round } from '../lib/types';

  interface Props {
    gameId: number;
    onFinish: (gameId: number) => void;
  }
  const { gameId, onFinish }: Props = $props();

  const game = liveQueryState(() => db.games.get(gameId), undefined);
  const rounds = liveQueryState(
    () => db.rounds.where('gameId').equals(gameId).sortBy('index'),
    [] as Round[],
  );

  const totals = $derived(game.value ? computeTotals(game.value, rounds.value) : []);
  const standings = $derived([...totals].sort((a, b) => a.rank - b.rank));

  let draft = $state<Record<string, string>>({});
  let editingRound = $state<Round | null>(null);
  let finishOpen = $state(false);
  let entryCardEl = $state<HTMLDivElement>();
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
    queueMicrotask(() => {
      entryCardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      inputEls[0]?.focus();
      inputEls[0]?.select();
    });
  }

  function cancelEdit() {
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
      await updateRound(editingRound.id!, scores);
      editingRound = null;
    } else {
      await addRound(gameId, scores);
    }
    resetDraft();
    inputEls[0]?.focus();
  }

  async function handleDeleteRound() {
    if (!editingRound?.id) return;
    await deleteRound(editingRound.id);
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
  <div class="space-y-5 pb-24">
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
          class="card preset-tonal flex min-w-[7rem] shrink-0 flex-col items-center gap-0.5 px-3 py-2 {t.rank ===
          1
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

    <div
      bind:this={entryCardEl}
      class="card space-y-3 border p-4 {editingRound
        ? 'preset-tonal-primary border-primary-500'
        : 'preset-filled-surface-100-900 border-surface-200-800'}"
    >
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {editingRound
            ? `Editing round ${editingRound.index}`
            : `Round ${rounds.value.length + 1}`}
        </h3>
        {#if editingRound}
          <button
            type="button"
            class="btn-icon btn-icon-sm hover:preset-tonal"
            aria-label="Cancel editing"
            onclick={cancelEdit}
          >
            <X size={16} />
          </button>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {#each game.value.players as player, i (player.id)}
          <label class="block">
            <span class="mb-1 block truncate text-xs font-medium opacity-60">{player.name}</span>
            <input
              type="number"
              inputmode="numeric"
              class="input w-full text-center"
              placeholder="0"
              bind:value={draft[player.id]}
              bind:this={inputEls[i]}
              onkeydown={(e) => handleScoreKeydown(e, i)}
              onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
          </label>
        {/each}
      </div>

      <div class="flex gap-2">
        {#if editingRound}
          <button type="button" class="btn preset-tonal-error" onclick={handleDeleteRound}>
            <Trash2 size={16} />
            Delete
          </button>
        {/if}
        <button type="button" class="btn preset-filled-primary flex-1" onclick={submitRound}>
          <Plus size={18} />
          {editingRound ? 'Save round' : 'Add round'}
        </button>
      </div>
    </div>

    {#if rounds.value.length > 0}
      <ol class="space-y-2">
        {#each rounds.value as round (round.id)}
          <li>
            <button
              type="button"
              class="card preset-filled-surface-100-900 flex w-full flex-wrap items-center gap-x-3 gap-y-1 border p-3 text-left {editingRound?.id ===
              round.id
                ? 'border-primary-500'
                : 'border-surface-200-800'}"
              onclick={() => startEdit(round)}
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
    class="border-surface-200-800 bg-surface-50-950/95 fixed inset-x-0 bottom-0 z-10 mx-auto max-w-2xl border-t px-4 py-3 backdrop-blur"
    style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
  >
    <button type="button" class="btn preset-tonal w-full" onclick={() => (finishOpen = true)}>
      <FlagTriangleRight size={18} />
      Finish game
    </button>
  </div>

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
