<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { Trophy, Medal, Share2, Plus, RotateCcw, Home } from '@lucide/svelte';
  import { toPng } from 'html-to-image';
  import { db, computeTotals, reopenGame } from '../lib/db';
  import { liveQueryState } from '../lib/liveQuery.svelte';
  import { toaster } from '../lib/toaster';
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

  const standings = $derived(
    game.value ? [...computeTotals(game.value, rounds.value)].sort((a, b) => a.rank - b.rank) : [],
  );
  const winner = $derived(standings[0]);

  const confettiPieces = Array.from({ length: 28 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.2 + Math.random() * 1.4,
    hue: Math.floor(Math.random() * 360),
    drift: (Math.random() - 0.5) * 60,
  }));

  let cardEl = $state<HTMLDivElement | undefined>();
  let sharing = $state(false);
  let reopenOpen = $state(false);

  function medalClass(rank: number) {
    if (rank === 1) return 'text-warning-500';
    if (rank === 2) return 'text-surface-400';
    if (rank === 3) return 'text-[#cd7f32]';
    return 'opacity-40';
  }

  async function shareImage() {
    if (!cardEl || sharing) return;
    sharing = true;
    try {
      const dataUrl = await toPng(cardEl, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${game.value?.name ?? 'scoreboard'}.png`, {
        type: 'image/png',
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: game.value?.name,
          text: winner ? `${winner.player.name} won ${game.value?.name}!` : game.value?.name,
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${game.value?.name ?? 'scoreboard'}.png`;
        link.click();
        toaster.info({
          title: 'Image saved',
          description: 'Sharing is not supported on this device.',
        });
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error(err);
        toaster.error({ title: 'Could not share image' });
      }
    } finally {
      sharing = false;
    }
  }

  async function handleReopen() {
    if (!gameId) return;
    await reopenGame(gameId);
    push(`/game/${gameId}`);
  }
</script>

{#if !game.value}
  <p class="py-10 text-center opacity-60">Loading game…</p>
{:else}
  <div class="relative space-y-6 pb-6">
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {#each confettiPieces as piece, i (i)}
        <span
          class="confetti-piece"
          style="left:{piece.left}%; animation-delay:{piece.delay}s; animation-duration:{piece.duration}s; background: hsl({piece.hue} 85% 60%); --drift: {piece.drift}px;"
        ></span>
      {/each}
    </div>

    <div
      bind:this={cardEl}
      class="card preset-filled-surface-100-900 border-surface-200-800 relative z-[1] space-y-5 border p-5"
    >
      <div class="flex flex-col items-center gap-2 py-4 text-center">
        <Trophy size={48} class="text-warning-500 drop-shadow" />
        <p class="text-sm font-medium tracking-wide uppercase opacity-60">{game.value.name}</p>
        {#if winner}
          <h2 class="text-2xl font-extrabold">{winner.player.name} wins!</h2>
          <p class="text-lg font-semibold opacity-80">{winner.total} points</p>
        {/if}
      </div>

      <ol class="space-y-2">
        {#each standings as t (t.player.id)}
          <li
            class="rounded-container flex items-center gap-3 px-3 py-2.5 {t.rank === 1
              ? 'preset-tonal-warning'
              : 'preset-tonal'}"
          >
            <span class="flex w-7 shrink-0 items-center justify-center">
              {#if t.rank <= 3}
                <Medal size={20} class={medalClass(t.rank)} />
              {:else}
                <span class="text-sm font-semibold opacity-50">{t.rank}</span>
              {/if}
            </span>
            <span class="flex-1 font-medium">{t.player.name}</span>
            <span class="text-lg font-bold tabular-nums">{t.total}</span>
          </li>
        {/each}
      </ol>

      <p class="text-center text-xs opacity-40">
        {rounds.value.length} round{rounds.value.length === 1 ? '' : 's'} ·
        {game.value.winCondition === 'highest' ? 'most points wins' : 'fewest points wins'} · Scores
      </p>
    </div>

    <div class="relative z-[1] flex flex-col gap-2">
      <button
        type="button"
        class="btn preset-filled-primary w-full"
        onclick={shareImage}
        disabled={sharing}
      >
        <Share2 size={18} />
        {sharing ? 'Preparing…' : 'Share scoreboard'}
      </button>
      <div class="flex gap-2">
        <button type="button" class="btn preset-tonal flex-1" onclick={() => (reopenOpen = true)}>
          <RotateCcw size={16} />
          Reopen
        </button>
        <button type="button" class="btn preset-tonal flex-1" onclick={() => push('/new')}>
          <Plus size={16} />
          New game
        </button>
        <button type="button" class="btn preset-tonal flex-1" onclick={() => push('/')}>
          <Home size={16} />
          Home
        </button>
      </div>
    </div>
  </div>

  <ConfirmDialog
    open={reopenOpen}
    onOpenChange={(o) => (reopenOpen = o)}
    title="Reopen game?"
    description="You'll be able to add more rounds. The game will move back to your active games."
    confirmLabel="Reopen"
    danger={false}
    onConfirm={handleReopen}
  />
{/if}

<style>
  .confetti-piece {
    position: absolute;
    top: -10px;
    width: 8px;
    height: 14px;
    border-radius: 2px;
    animation-name: confetti-fall;
    animation-timing-function: ease-in;
    animation-fill-mode: forwards;
  }

  @keyframes confetti-fall {
    0% {
      transform: translate3d(0, -10px, 0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translate3d(var(--drift), 100vh, 0) rotate(540deg);
      opacity: 0.2;
    }
  }
</style>
