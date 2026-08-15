<script lang="ts">
  import { replace } from 'svelte-spa-router';
  import { Plus, Trash2, TrendingUp, TrendingDown } from '@lucide/svelte';
  import { SegmentedControl } from '@skeletonlabs/skeleton-svelte';
  import { createGame, listRecentPlayerNames } from '../lib/db';
  import { toaster } from '../lib/toaster';
  import type { WinCondition } from '../lib/types';

  let gameName = $state('');
  let playerNames = $state<string[]>(['', '']);
  let winCondition = $state<WinCondition>('highest');
  let recentNames = $state<string[]>([]);
  let submitting = $state(false);

  listRecentPlayerNames().then((names) => (recentNames = names));

  function addPlayer() {
    playerNames = [...playerNames, ''];
  }

  function removePlayer(i: number) {
    if (playerNames.length <= 2) return;
    playerNames = playerNames.filter((_, idx) => idx !== i);
  }

  const trimmedNames = $derived(playerNames.map((n) => n.trim()));
  const canSubmit = $derived(
    trimmedNames.length >= 2 && trimmedNames.every((n) => n.length > 0),
  );

  async function startGame() {
    if (!canSubmit || submitting) return;
    submitting = true;
    try {
      const id = await createGame(
        gameName || defaultGameName(),
        trimmedNames,
        winCondition,
      );
      replace(`/game/${id}`);
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

<form class="space-y-6 pb-6" onsubmit={(e) => { e.preventDefault(); startGame(); }}>
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
            list="recent-players"
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
    <datalist id="recent-players">
      {#each recentNames as name (name)}
        <option value={name}></option>
      {/each}
    </datalist>
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

  <button type="submit" class="btn preset-filled-primary w-full" disabled={!canSubmit || submitting}>
    Start game
  </button>
</form>
