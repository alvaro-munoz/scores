import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import GameCard from './GameCard.svelte';
import type { Game } from '../types';

function makeGame(overrides: Partial<Game> = {}): Game {
  const now = Date.now();
  return {
    id: 1,
    name: 'Friday night',
    players: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ],
    rounds: [],
    winCondition: 'highest',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('GameCard', () => {
  it('shows the name, player count, and "no rounds" state', () => {
    render(GameCard, { game: makeGame(), onOpen: vi.fn(), onRequestDelete: vi.fn() });

    expect(screen.getByText('Friday night')).toBeInTheDocument();
    expect(screen.getByText(/2 players/)).toBeInTheDocument();
    expect(screen.getByText('No rounds yet')).toBeInTheDocument();
  });

  it('shows "Created" but not "Updated" when the game has never been touched', () => {
    const now = Date.now();
    render(GameCard, {
      game: makeGame({ createdAt: now, updatedAt: now }),
      onOpen: vi.fn(),
      onRequestDelete: vi.fn(),
    });

    expect(screen.getByText(/Created/)).toBeInTheDocument();
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });

  it('shows "Updated" once the game has been touched since creation', () => {
    const now = Date.now();
    render(GameCard, {
      game: makeGame({ createdAt: now - 60_000, updatedAt: now }),
      onOpen: vi.fn(),
      onRequestDelete: vi.fn(),
    });

    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it('shows the leader and "leads with" for an in-progress game', () => {
    render(GameCard, {
      game: makeGame({ rounds: [{ index: 1, scores: { p1: 10, p2: 4 } }] }),
      onOpen: vi.fn(),
      onRequestDelete: vi.fn(),
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/leads with/)).toBeInTheDocument();
  });

  it('says "won with" instead of "leads with" once the game is finished', () => {
    render(GameCard, {
      game: makeGame({
        status: 'finished',
        rounds: [{ index: 1, scores: { p1: 10, p2: 4 } }],
      }),
      onOpen: vi.fn(),
      onRequestDelete: vi.fn(),
    });

    expect(screen.getByText(/won with/)).toBeInTheDocument();
  });

  it('shows the Active/Finished badge matching game status', () => {
    const { rerender } = render(GameCard, {
      game: makeGame({ status: 'active' }),
      onOpen: vi.fn(),
      onRequestDelete: vi.fn(),
    });
    expect(screen.getByText('Active')).toBeInTheDocument();

    rerender({ game: makeGame({ status: 'finished' }), onOpen: vi.fn(), onRequestDelete: vi.fn() });
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('calls onOpen with the game when the card is clicked', async () => {
    const onOpen = vi.fn();
    const game = makeGame();
    render(GameCard, { game, onOpen, onRequestDelete: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: /Friday night/ }));

    expect(onOpen).toHaveBeenCalledWith(game);
  });

  it('calls onRequestDelete (not onOpen) when the delete button is clicked', async () => {
    const onOpen = vi.fn();
    const onRequestDelete = vi.fn();
    const game = makeGame();
    render(GameCard, { game, onOpen, onRequestDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Delete game' }));

    expect(onRequestDelete).toHaveBeenCalledWith(game);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
