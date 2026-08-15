import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import NewGame from './NewGame.svelte';
import { db } from '../lib/db';

beforeEach(async () => {
  await db.games.clear();
});

describe('NewGame', () => {
  it('starts with two player fields, and disables removing below two', () => {
    render(NewGame, { onCreated: vi.fn() });

    expect(screen.getByPlaceholderText('Player 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Player 2')).toBeInTheDocument();
    for (const btn of screen.getAllByRole('button', { name: 'Remove player' })) {
      expect(btn).toBeDisabled();
    }
  });

  it('"Add player" adds a field and enables removal', async () => {
    render(NewGame, { onCreated: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: /Add player/ }));

    expect(screen.getByPlaceholderText('Player 3')).toBeInTheDocument();
    for (const btn of screen.getAllByRole('button', { name: 'Remove player' })) {
      expect(btn).toBeEnabled();
    }
  });

  it("creates a game using each blank field's own placeholder as the player name", async () => {
    const onCreated = vi.fn();
    render(NewGame, { onCreated });

    // Leave both player fields blank and submit.
    await userEvent.click(screen.getByRole('button', { name: 'Start game' }));

    // startGame() awaits createGame() internally, so onCreated fires on a
    // later microtask than the click itself resolves on - wait for it
    // rather than asserting immediately after the click.
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    const id = onCreated.mock.calls[0][0];
    const game = await db.games.get(id);
    expect(game!.players.map((p) => p.name)).toEqual(['Player 1', 'Player 2']);
  });

  it('uses typed player names when provided', async () => {
    const onCreated = vi.fn();
    render(NewGame, { onCreated });

    await userEvent.type(screen.getByPlaceholderText('Player 1'), 'Alice');
    await userEvent.type(screen.getByPlaceholderText('Player 2'), 'Bob');
    await userEvent.click(screen.getByRole('button', { name: 'Start game' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    const id = onCreated.mock.calls[0][0];
    const game = await db.games.get(id);
    expect(game!.players.map((p) => p.name)).toEqual(['Alice', 'Bob']);
  });

  it('defaults to "most points wins" and saves the chosen win condition', async () => {
    const onCreated = vi.fn();
    render(NewGame, { onCreated });

    await userEvent.click(screen.getByRole('radio', { name: /Fewest points/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start game' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    const id = onCreated.mock.calls[0][0];
    const game = await db.games.get(id);
    expect(game!.winCondition).toBe('lowest');
  });

  it('falls back to a date-based name when the game name is left blank', async () => {
    const onCreated = vi.fn();
    render(NewGame, { onCreated });

    await userEvent.click(screen.getByRole('button', { name: 'Start game' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    const id = onCreated.mock.calls[0][0];
    const game = await db.games.get(id);
    const expected =
      new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' game';
    expect(game!.name).toBe(expected);
  });
});
