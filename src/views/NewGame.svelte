<script lang="ts">
  import { Plus, Trash2, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { SegmentedControl } from '@skeletonlabs/skeleton-svelte';
  import { createGame } from '../lib/db';
  import { toaster } from '../lib/toaster';
  import type { WinCondition } from '../lib/types';

  interface Props {
    onCreated: (gameId: number) => void;
  }
  const { onCreated }: Props = $props();

  let gameName = $state('');
  let playerNames = $state<string[]>(['', '']);
  let winCondition = $state<WinCondition>('highest');
  let submitting = $state(false);

  function addPlayer() {
    playerNames = [...playerNames, ''];
  }

  function removePlayer(i: number) {
    if (playerNames.length <= 2) return;
    playerNames = playerNames.filter((_, idx) => idx !== i);
  }

  // A blank field falls back to its own placeholder ("Player 2", etc.) rather
  // than blocking submission — the placeholder is a usable default, not just
  // a hint.
  const trimmedNames = $derived(playerNames.map((n, i) => n.trim() || `Player ${i + 1}`));
  const canSubmit = $derived(trimmedNames.length >= 2);

  async function startGame() {
    if (!canSubmit || submitting) return;
    submitting = true;
    try {
      const id = await createGame(gameName || defaultGameName(), trimmedNames, winCondition);
      onCreated(id);
    } catch (err) {
      console.error(err);
      toaster.error({ title: 'Could not create game' });
      submitting = false;
    }
  }

  function defaultGameName() {
    return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' game';
  }
</script>

<form
  class="space-y-6 pb-6"
  onsubmit={(e) => {
    e.preventDefault();
    startGame();
  }}
>
  <label class="label">
    <span class="label-text text-sm font-medium">Game name</span>
    <input
      type="text"
      class="input"
      placeholder={defaultGameName()}
      bind:value={gameName}
      maxlength="60"
    />
  </label>

  <div class="space-y-2">
    <span class="label-text text-sm font-medium">Players</span>
    <div class="space-y-2">
      {#each playerNames as _, i (i)}
        <div class="flex items-center gap-2">
          <input
            type="text"
            class="input"
            placeholder={`Player ${i + 1}`}
            bind:value={playerNames[i]}
            maxlength="30"
          />
          <button
            type="button"
            class="btn-icon btn-icon-sm hover:preset-tonal-error disabled:opacity-30"
            aria-label="Remove player"
            disabled={playerNames.length <= 2}
            onclick={() => removePlayer(i)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      {/each}
    </div>
    <button type="button" class="btn preset-tonal w-full" onclick={addPlayer}>
      <Plus size={16} />
      Add player
    </button>
  </div>

  <div class="space-y-2">
    <span class="label-text text-sm font-medium">Winner is decided by</span>
    <SegmentedControl
      value={winCondition}
      onValueChange={(d) => (winCondition = (d.value as WinCondition) ?? 'highest')}
    >
      <SegmentedControl.Control class="w-full">
        <SegmentedControl.Indicator />
        <SegmentedControl.Item value="highest" class="flex-1">
          <SegmentedControl.ItemText class="flex items-center justify-center gap-1.5">
            <TrendingUp size={16} /> Most points
          </SegmentedControl.ItemText>
          <SegmentedControl.ItemHiddenInput />
        </SegmentedControl.Item>
        <SegmentedControl.Item value="lowest" class="flex-1">
          <SegmentedControl.ItemText class="flex items-center justify-center gap-1.5">
            <TrendingDown size={16} /> Fewest points
          </SegmentedControl.ItemText>
          <SegmentedControl.ItemHiddenInput />
        </SegmentedControl.Item>
      </SegmentedControl.Control>
    </SegmentedControl>
  </div>

  <button
    type="submit"
    class="btn preset-filled-primary w-full"
    disabled={!canSubmit || submitting}
  >
    Start game
  </button>
</form>
