import Dexie, { type Table } from 'dexie';
import type { Game, Round, Player, PlayerTotal } from './types';

// Exported (not just the `db` singleton below) so tests can open an
// isolated, differently-named instance — e.g. to exercise the v1 -> v2
// upgrade path against a throwaway database instead of the real one.
export class ScoresDB extends Dexie {
  games!: Table<Game, number>;

  constructor(name = 'scores-db') {
    super(name);

    // v1 had separate `rounds` and `recentPlayers` tables. Rounds are few
    // enough per game (and always loaded/saved as a whole with their game)
    // that a table plus joins was unwarranted complexity, and player-name
    // autocomplete wasn't worth a whole table either — so v2 folds rounds
    // into `Game.rounds` and drops `recentPlayers` entirely.
    this.version(1).stores({
      games: '++id, status, createdAt',
      rounds: '++id, gameId, [gameId+index]',
      recentPlayers: 'name, lastUsedAt',
    });

    this.version(2)
      .stores({
        games: '++id, status, createdAt',
        rounds: null,
        recentPlayers: null,
      })
      .upgrade(async (tx) => {
        const roundsByGame = new Map<number, Round[]>();
        for (const r of await tx.table('rounds').toArray()) {
          const list = roundsByGame.get(r.gameId) ?? [];
          list.push({ index: r.index, scores: r.scores });
          roundsByGame.set(r.gameId, list);
        }
        await tx
          .table('games')
          .toCollection()
          .modify((game) => {
            const rounds = roundsByGame.get(game.id) ?? [];
            rounds.sort((a, b) => a.index - b.index);
            game.rounds = rounds;
          });
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

  return db.games.add({
    name: name.trim() || 'Untitled game',
    players,
    rounds: [],
    winCondition,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
}

export async function addRound(gameId: number, scores: Record<string, number>): Promise<void> {
  await db.transaction('rw', db.games, async () => {
    const game = await db.games.get(gameId);
    if (!game) return;
    const index = (game.rounds.at(-1)?.index ?? 0) + 1;
    await db.games.update(gameId, {
      rounds: [...game.rounds, { index, scores }],
      updatedAt: Date.now(),
    });
  });
}

export async function updateRound(
  gameId: number,
  index: number,
  scores: Record<string, number>,
): Promise<void> {
  await db.transaction('rw', db.games, async () => {
    const game = await db.games.get(gameId);
    if (!game) return;
    const rounds = game.rounds.map((r) => (r.index === index ? { ...r, scores } : r));
    await db.games.update(gameId, { rounds, updatedAt: Date.now() });
  });
}

export async function deleteRound(gameId: number, index: number): Promise<void> {
  await db.transaction('rw', db.games, async () => {
    const game = await db.games.get(gameId);
    if (!game) return;
    // Re-number remaining rounds so indices stay contiguous.
    const rounds = game.rounds
      .filter((r) => r.index !== index)
      .map((r, i) => ({ ...r, index: i + 1 }));
    await db.games.update(gameId, { rounds, updatedAt: Date.now() });
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
  await db.games.delete(gameId);
}

export async function renameGame(gameId: number, name: string): Promise<void> {
  await db.games.update(gameId, {
    name: name.trim() || 'Untitled game',
    updatedAt: Date.now(),
  });
}

/** Sum each player's scores across rounds, ranked according to the game's win condition. */
export function computeTotals(game: Game): PlayerTotal[] {
  const sums = new Map<string, number>();
  for (const p of game.players) sums.set(p.id, 0);
  for (const round of game.rounds) {
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
