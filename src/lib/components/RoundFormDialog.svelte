<script lang="ts">
  import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
  import { X } from '@lucide/svelte';
  import type { Player } from '../types';

  interface Props {
    open: boolean;
    title: string;
    players: Player[];
    initialScores?: Record<string, number>;
    onSave: (scores: Record<string, number>) => void;
    onOpenChange: (open: boolean) => void;
    extraAction?: { label: string; onClick: () => void };
  }

  let { open, title, players, initialScores, onSave, onOpenChange, extraAction }: Props = $props();

  let draft = $state<Record<string, string>>({});

  // Reset the draft whenever the dialog opens for a (possibly different) round.
  $effect(() => {
    if (open) {
      const next: Record<string, string> = {};
      for (const p of players) {
        const v = initialScores?.[p.id];
        next[p.id] = v !== undefined ? String(v) : '';
      }
      draft = next;
    }
  });

  function save() {
    const scores: Record<string, number> = {};
    for (const p of players) {
      const n = Number(draft[p.id]);
      scores[p.id] = Number.isFinite(n) ? n : 0;
    }
    onSave(scores);
    onOpenChange(false);
  }
</script>

<Dialog {open} onOpenChange={(d) => onOpenChange(d.open)} closeOnInteractOutside={false}>
  <Portal>
    <Dialog.Backdrop class="fixed inset-0 z-50 bg-surface-50-950/60" />
    <Dialog.Positioner class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <Dialog.Content
        class="card w-full max-w-md space-y-4 rounded-b-none bg-surface-100-900 p-5 shadow-xl sm:rounded-b-container"
        style="padding-bottom: max(1.25rem, env(safe-area-inset-bottom));"
      >
        <header class="flex items-center justify-between">
          <Dialog.Title class="text-lg font-bold">{title}</Dialog.Title>
          <Dialog.CloseTrigger class="btn-icon btn-icon-sm hover:preset-tonal" aria-label="Close">
            <X size={16} />
          </Dialog.CloseTrigger>
        </header>

        <div class="max-h-[50vh] space-y-3 overflow-y-auto">
          {#each players as player (player.id)}
            <label class="flex items-center justify-between gap-3">
              <span class="font-medium">{player.name}</span>
              <input
                type="number"
                inputmode="numeric"
                class="input w-24 text-right"
                placeholder="0"
                bind:value={draft[player.id]}
              />
            </label>
          {/each}
        </div>

        <footer class="flex items-center justify-between gap-2">
          {#if extraAction}
            <button type="button" class="btn preset-tonal-error" onclick={extraAction.onClick}>
              {extraAction.label}
            </button>
          {:else}
            <span></span>
          {/if}
          <button type="button" class="btn preset-filled-primary" onclick={save}>Save</button>
        </footer>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog>
