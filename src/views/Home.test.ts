import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Home from './Home.svelte';
import { db, createGame, finishGame } from '../lib/db';

beforeEach(async () => {
  await db.games.clear();
});

describe('Home', () => {
  it('shows the empty state with no games', async () => {
    render(Home, { onNewGame: vi.fn(), onOpenGame: vi.fn(), onOpenSummary: vi.fn() });

    expect(await screen.findByText('No games yet')).toBeInTheDocument();
    expect(screen.queryByLabelText('New game')).not.toBeInTheDocument();
  });

  it('groups games into Active and Finished sections', async () => {
    const activeId = await createGame('Active game', ['Alice', 'Bob'], 'highest');
    const finishedId = await createGame('Finished game', ['Alice', 'Bob'], 'highest');
    await finishGame(finishedId);

    render(Home, { onNewGame: vi.fn(), onOpenGame: vi.fn(), onOpenSummary: vi.fn() });

    expect(await screen.findByText('Active game')).toBeInTheDocument();
    expect(screen.getByText('Finished game')).toBeInTheDocument();
    expect(screen.getByText('Active games')).toBeInTheDocument();
    expect(screen.getByText('Finished games')).toBeInTheDocument();
    // Keep both ids referenced so this test still fails loudly (unused-var
    // lint) if the setup above stops actually creating two distinct games.
    expect(activeId).not.toBe(finishedId);
  });

  it('opens an active game via onOpenGame and a finished one via onOpenSummary', async () => {
    await createGame('Active game', ['Alice', 'Bob'], 'highest');
    const finishedId = await createGame('Finished game', ['Alice', 'Bob'], 'highest');
    await finishGame(finishedId);

    const onOpenGame = vi.fn();
    const onOpenSummary = vi.fn();
    render(Home, { onNewGame: vi.fn(), onOpenGame, onOpenSummary });

    await userEvent.click(await screen.findByText('Active game'));
    expect(onOpenGame).toHaveBeenCalledOnce();
    expect(onOpenSummary).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('Finished game'));
    expect(onOpenSummary).toHaveBeenCalledWith(finishedId);
  });

  it('deletes a game after confirming', async () => {
    const id = await createGame('Doomed game', ['Alice', 'Bob'], 'highest');
    render(Home, { onNewGame: vi.fn(), onOpenGame: vi.fn(), onOpenSummary: vi.fn() });

    await screen.findByText('Doomed game');
    await userEvent.click(screen.getByRole('button', { name: 'Delete game' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No games yet')).toBeInTheDocument();
    expect(await db.games.get(id)).toBeUndefined();
  });

  it('keeps the game when delete is cancelled', async () => {
    const id = await createGame('Safe game', ['Alice', 'Bob'], 'highest');
    render(Home, { onNewGame: vi.fn(), onOpenGame: vi.fn(), onOpenSummary: vi.fn() });

    await screen.findByText('Safe game');
    await userEvent.click(screen.getByRole('button', { name: 'Delete game' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Safe game')).toBeInTheDocument();
    expect(await db.games.get(id)).toBeDefined();
  });

  it('"New game" calls onNewGame from both the empty state and the FAB', async () => {
    const onNewGame = vi.fn();
    const { unmount } = render(Home, {
      onNewGame,
      onOpenGame: vi.fn(),
      onOpenSummary: vi.fn(),
    });
    await userEvent.click(await screen.findByRole('button', { name: /New game/ }));
    expect(onNewGame).toHaveBeenCalledOnce();
    unmount();

    await createGame('Some game', ['Alice', 'Bob'], 'highest');
    const onNewGame2 = vi.fn();
    render(Home, { onNewGame: onNewGame2, onOpenGame: vi.fn(), onOpenSummary: vi.fn() });
    await userEvent.click(await screen.findByLabelText('New game'));
    expect(onNewGame2).toHaveBeenCalledOnce();
  });
});
