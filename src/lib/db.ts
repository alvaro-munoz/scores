import Dexie, { type Table } from 'dexie';
import type { Game, Round, RecentPlayer, Player, PlayerTotal } from './types';

class ScoresDB extends Dexie {
  games!: Table<Game, number>;
  rounds!: Table<Round, number>;
  recentPlayers!: Table<RecentPlayer, string>;

  constructor() {
    super('scores-db');
    this.version(1).stores({
      games: '++id, status, createdAt',
      rounds: '++id, gameId, [gameId+index]',
      recentPlayers: 'name, lastUsedAt',
    });
  }
}

export const db = new ScoresDB();

function makePlayerId(): string {
  return crypto.randomUUID();
}

export async function createGame(
  name: string,
  playerNames: string[],
  winCondition: 'highest' | 'lowest',
): Promise<number> {
  const players: Player[] = playerNames.map((n) => ({ id: makePlayerId(), name: n.trim() }));
  const now = Date.now();

  const gameId = await db.transaction('rw', db.games, db.recentPlayers, async () => {
    const id = await db.games.add({
      name: name.trim() || 'Untitled game',
      players,
      winCondition,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    for (const p of players) {
      const existing = await db.recentPlayers.get(p.name);
      await db.recentPlayers.put({
        name: p.name,
        lastUsedAt: now,
        timesUsed: (existing?.timesUsed ?? 0) + 1,
      });
    }

    return id;
  });

  return gameId as number;
}

export async function addRound(gameId: number, scores: Record<string, number>): Promise<number> {
  return db.transaction('rw', db.games, db.rounds, async () => {
    const lastRound = await db.rounds.where('gameId').equals(gameId).last();
    const index = (lastRound?.index ?? 0) + 1;
    const id = await db.rounds.add({
      gameId,
      index,
      scores,
      createdAt: Date.now(),
    });
    await db.games.update(gameId, { updatedAt: Date.now() });
    return id;
  });
}

export async function updateRound(roundId: number, scores: Record<string, number>): Promise<void> {
  await db.transaction('rw', db.games, db.rounds, async () => {
    const round = await db.rounds.get(roundId);
    if (!round) return;
    await db.rounds.update(roundId, { scores });
    await db.games.update(round.gameId, { updatedAt: Date.now() });
  });
}

export async function deleteRound(roundId: number): Promise<void> {
  const round = await db.rounds.get(roundId);
  if (!round) return;
  await db.transaction('rw', db.games, db.rounds, async () => {
    await db.rounds.delete(roundId);
    // Re-number remaining rounds so indices stay contiguous.
    const remaining = await db.rounds.where('gameId').equals(round.gameId).sortBy('index');
    await Promise.all(remaining.map((r, i) => db.rounds.update(r.id!, { index: i + 1 })));
    await db.games.update(round.gameId, { updatedAt: Date.now() });
  });
}

export async function finishGame(gameId: number): Promise<void> {
  const now = Date.now();
  await db.games.update(gameId, { status: 'finished', finishedAt: now, updatedAt: now });
}

export async function reopenGame(gameId: number): Promise<void> {
  await db.games.update(gameId, {
    status: 'active',
    finishedAt: undefined,
    updatedAt: Date.now(),
  });
}

export async function deleteGame(gameId: number): Promise<void> {
  await db.transaction('rw', db.games, db.rounds, async () => {
    await db.rounds.where('gameId').equals(gameId).delete();
    await db.games.delete(gameId);
  });
}

export async function renameGame(gameId: number, name: string): Promise<void> {
  await db.games.update(gameId, {
    name: name.trim() || 'Untitled game',
    updatedAt: Date.now(),
  });
}

export async function listRecentPlayerNames(limit = 20): Promise<string[]> {
  const all = await db.recentPlayers.orderBy('lastUsedAt').reverse().limit(limit).toArray();
  return all.map((p) => p.name);
}

/** Sum each player's scores across rounds, ranked according to the game's win condition. */
export function computeTotals(game: Game, rounds: Round[]): PlayerTotal[] {
  const sums = new Map<string, number>();
  for (const p of game.players) sums.set(p.id, 0);
  for (const round of rounds) {
    for (const [playerId, score] of Object.entries(round.scores)) {
      sums.set(playerId, (sums.get(playerId) ?? 0) + score);
    }
  }

  const totals = game.players.map((player) => ({
    player,
    total: sums.get(player.id) ?? 0,
  }));

  const sorted = [...totals].sort((a, b) =>
    game.winCondition === 'highest' ? b.total - a.total : a.total - b.total,
  );

  const best = sorted[0]?.total;
  let rank = 0;
  let lastTotal: number | null = null;
  const ranked: PlayerTotal[] = sorted.map((t, i) => {
    if (lastTotal === null || t.total !== lastTotal) {
      rank = i + 1;
      lastTotal = t.total;
    }
    return {
      player: t.player,
      total: t.total,
      rank,
      isWinner: t.total === best,
    };
  });

  // Return in the same order as game.players for stable table rows.
  return game.players.map((p) => ranked.find((r) => r.player.id === p.id)!);
}
