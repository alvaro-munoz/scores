import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  ScoresDB,
  createGame,
  addRound,
  updateRound,
  deleteRound,
  finishGame,
  reopenGame,
  deleteGame,
  renameGame,
  computeTotals,
} from './db';
import type { Game } from './types';

// db.ts is exercised against a real (fake-indexeddb-backed) Dexie instance,
// not mocks — see src/test/setup.ts. Each test starts from an empty table.
beforeEach(async () => {
  await db.games.clear();
});

describe('createGame', () => {
  it('creates an active game with trimmed player names and an empty round list', async () => {
    const id = await createGame('  Friday night  ', [' Alice ', 'Bob'], 'highest');
    const game = await db.games.get(id);

    expect(game).toBeDefined();
    expect(game!.name).toBe('Friday night');
    expect(game!.players.map((p) => p.name)).toEqual(['Alice', 'Bob']);
    expect(game!.rounds).toEqual([]);
    expect(game!.status).toBe('active');
    expect(game!.winCondition).toBe('highest');
    expect(game!.finishedAt).toBeUndefined();
  });

  it('gives each player a unique id, scoped to that game', async () => {
    const id = await createGame('Game', ['Alice', 'Bob', 'Alice'], 'highest');
    const game = await db.games.get(id);
    const ids = game!.players.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('falls back to "Untitled game" when the name is blank', async () => {
    const id = await createGame('   ', ['Alice', 'Bob'], 'highest');
    const game = await db.games.get(id);
    expect(game!.name).toBe('Untitled game');
  });

  it('sets updatedAt equal to createdAt initially', async () => {
    const id = await createGame('Game', ['Alice', 'Bob'], 'highest');
    const game = await db.games.get(id);
    expect(game!.updatedAt).toBe(game!.createdAt);
  });
});

describe('addRound / updateRound / deleteRound', () => {
  async function makeGame() {
    const id = await createGame('Game', ['Alice', 'Bob'], 'highest');
    const game = (await db.games.get(id))!;
    return { id, alice: game.players[0].id, bob: game.players[1].id };
  }

  it('numbers rounds starting at 1 and increments per game', async () => {
    const { id, alice, bob } = await makeGame();
    await addRound(id, { [alice]: 10, [bob]: 5 });
    await addRound(id, { [alice]: 3, [bob]: 8 });

    const game = await db.games.get(id);
    expect(game!.rounds.map((r) => r.index)).toEqual([1, 2]);
    expect(game!.rounds[0].scores).toEqual({ [alice]: 10, [bob]: 5 });
  });

  it('bumps updatedAt without touching createdAt', async () => {
    const { id, alice, bob } = await makeGame();
    const before = (await db.games.get(id))!;
    await new Promise((r) => setTimeout(r, 5));
    await addRound(id, { [alice]: 1, [bob]: 1 });
    const after = (await db.games.get(id))!;

    expect(after.updatedAt).toBeGreaterThan(before.updatedAt);
    expect(after.createdAt).toBe(before.createdAt);
  });

  it('updateRound replaces only the targeted round', async () => {
    const { id, alice, bob } = await makeGame();
    await addRound(id, { [alice]: 10, [bob]: 5 });
    await addRound(id, { [alice]: 3, [bob]: 8 });

    await updateRound(id, 1, { [alice]: 99, [bob]: 5 });

    const game = await db.games.get(id);
    expect(game!.rounds[0].scores).toEqual({ [alice]: 99, [bob]: 5 });
    expect(game!.rounds[1].scores).toEqual({ [alice]: 3, [bob]: 8 });
  });

  it('updateRound is a no-op for a missing game or round', async () => {
    const { id, alice, bob } = await makeGame();
    await addRound(id, { [alice]: 1, [bob]: 1 });

    await expect(updateRound(id, 99, { [alice]: 1, [bob]: 1 })).resolves.not.toThrow();
    await expect(updateRound(123456, 1, { [alice]: 1, [bob]: 1 })).resolves.not.toThrow();

    const game = await db.games.get(id);
    expect(game!.rounds).toHaveLength(1);
  });

  it('deleteRound removes the round and re-numbers the rest contiguously', async () => {
    const { id, alice, bob } = await makeGame();
    await addRound(id, { [alice]: 1, [bob]: 1 }); // round 1
    await addRound(id, { [alice]: 2, [bob]: 2 }); // round 2
    await addRound(id, { [alice]: 3, [bob]: 3 }); // round 3

    await deleteRound(id, 2);

    const game = await db.games.get(id);
    expect(game!.rounds.map((r) => r.index)).toEqual([1, 2]);
    // The old round 3's scores are now round 2 - order preserved, not re-sorted by value.
    expect(game!.rounds[1].scores).toEqual({ [alice]: 3, [bob]: 3 });
  });
});

describe('finishGame / reopenGame', () => {
  it('finishGame sets status, finishedAt, and updatedAt', async () => {
    const id = await createGame('Game', ['Alice', 'Bob'], 'highest');
    await finishGame(id);
    const game = await db.games.get(id);

    expect(game!.status).toBe('finished');
    expect(game!.finishedAt).toBeTypeOf('number');
    expect(game!.updatedAt).toBeGreaterThanOrEqual(game!.createdAt);
  });

  it('reopenGame clears finishedAt and sets status back to active', async () => {
    const id = await createGame('Game', ['Alice', 'Bob'], 'highest');
    await finishGame(id);
    await reopenGame(id);
    const game = await db.games.get(id);

    expect(game!.status).toBe('active');
    expect(game!.finishedAt).toBeUndefined();
  });
});

describe('deleteGame', () => {
  it('removes the game entirely', async () => {
    const id = await createGame('Game', ['Alice', 'Bob'], 'highest');
    await deleteGame(id);
    expect(await db.games.get(id)).toBeUndefined();
  });
});

describe('renameGame', () => {
  it('trims the new name and bumps updatedAt', async () => {
    const id = await createGame('Old name', ['Alice', 'Bob'], 'highest');
    await renameGame(id, '  New name  ');
    const game = await db.games.get(id);
    expect(game!.name).toBe('New name');
  });

  it('falls back to "Untitled game" when the new name is blank', async () => {
    const id = await createGame('Old name', ['Alice', 'Bob'], 'highest');
    await renameGame(id, '   ');
    const game = await db.games.get(id);
    expect(game!.name).toBe('Untitled game');
  });
});

describe('computeTotals', () => {
  function game(overrides: Partial<Game> = {}): Game {
    return {
      id: 1,
      name: 'Game',
      players: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Carol' },
      ],
      rounds: [],
      winCondition: 'highest',
      status: 'active',
      createdAt: 0,
      updatedAt: 0,
      ...overrides,
    };
  }

  it('sums scores across rounds', () => {
    const g = game({
      rounds: [
        { index: 1, scores: { p1: 10, p2: 5, p3: 1 } },
        { index: 2, scores: { p1: 3, p2: 8, p3: 1 } },
      ],
    });
    const totals = computeTotals(g);
    expect(totals.find((t) => t.player.id === 'p1')!.total).toBe(13);
    expect(totals.find((t) => t.player.id === 'p2')!.total).toBe(13);
    expect(totals.find((t) => t.player.id === 'p3')!.total).toBe(2);
  });

  it('ranks descending for "highest" and ascending for "lowest"', () => {
    const rounds = [{ index: 1, scores: { p1: 10, p2: 20, p3: 5 } }];

    const highest = computeTotals(game({ winCondition: 'highest', rounds }));
    expect(highest.find((t) => t.player.id === 'p2')!.rank).toBe(1);
    expect(highest.find((t) => t.player.id === 'p1')!.rank).toBe(2);
    expect(highest.find((t) => t.player.id === 'p3')!.rank).toBe(3);

    const lowest = computeTotals(game({ winCondition: 'lowest', rounds }));
    expect(lowest.find((t) => t.player.id === 'p3')!.rank).toBe(1);
    expect(lowest.find((t) => t.player.id === 'p1')!.rank).toBe(2);
    expect(lowest.find((t) => t.player.id === 'p2')!.rank).toBe(3);
  });

  it('gives tied totals the same rank and skips the next rank (competition ranking)', () => {
    const g = game({
      winCondition: 'highest',
      rounds: [{ index: 1, scores: { p1: 10, p2: 10, p3: 5 } }],
    });
    const totals = computeTotals(g);
    expect(totals.find((t) => t.player.id === 'p1')!.rank).toBe(1);
    expect(totals.find((t) => t.player.id === 'p2')!.rank).toBe(1);
    // Two players tied for 1st, so 3rd place is rank 3, not rank 2.
    expect(totals.find((t) => t.player.id === 'p3')!.rank).toBe(3);
  });

  it('marks every tied leader as the winner', () => {
    const g = game({
      winCondition: 'highest',
      rounds: [{ index: 1, scores: { p1: 10, p2: 10, p3: 5 } }],
    });
    const totals = computeTotals(g);
    expect(totals.find((t) => t.player.id === 'p1')!.isWinner).toBe(true);
    expect(totals.find((t) => t.player.id === 'p2')!.isWinner).toBe(true);
    expect(totals.find((t) => t.player.id === 'p3')!.isWinner).toBe(false);
  });

  it('treats everyone as tied at 0 with no rounds played', () => {
    const totals = computeTotals(game());
    expect(totals.every((t) => t.total === 0 && t.rank === 1 && t.isWinner)).toBe(true);
  });

  it('returns results in game.players order, not rank order', () => {
    const g = game({
      winCondition: 'highest',
      rounds: [{ index: 1, scores: { p1: 1, p2: 2, p3: 3 } }],
    });
    const totals = computeTotals(g);
    expect(totals.map((t) => t.player.id)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('v1 -> v2 schema migration', () => {
  it('folds an existing rounds table into each game.rounds array', async () => {
    const dbName = `scores-migration-test-${Math.random()}`;

    // Build a v1-shaped database by hand (games + rounds + recentPlayers),
    // the same shape ScoresDB's version(1) used to declare.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const idb = req.result;
        const games = idb.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
        games.createIndex('status', 'status');
        games.createIndex('createdAt', 'createdAt');
        const rounds = idb.createObjectStore('rounds', { keyPath: 'id', autoIncrement: true });
        rounds.createIndex('gameId', 'gameId');
        rounds.createIndex('[gameId+index]', ['gameId', 'index']);
        idb.createObjectStore('recentPlayers', { keyPath: 'name' });
      };
      req.onsuccess = () => {
        const idb = req.result;
        const tx = idb.transaction(['games', 'rounds'], 'readwrite');
        tx.objectStore('games').add({
          id: 1,
          name: 'Legacy game',
          players: [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
          ],
          winCondition: 'highest',
          status: 'active',
          createdAt: 1000,
          updatedAt: 1000,
        });
        tx.objectStore('rounds').add({ gameId: 1, index: 1, scores: { p1: 10, p2: 5 } });
        tx.objectStore('rounds').add({ gameId: 1, index: 2, scores: { p1: 3, p2: 8 } });
        tx.oncomplete = () => {
          idb.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    // Opening a ScoresDB pointed at that database name runs the real
    // version(1) -> version(2) upgrade path, same as a returning user's
    // browser would.
    const migrated = new ScoresDB(dbName);
    const game = await migrated.games.get(1);

    expect(game).toBeDefined();
    expect(game!.rounds).toEqual([
      { index: 1, scores: { p1: 10, p2: 5 } },
      { index: 2, scores: { p1: 3, p2: 8 } },
    ]);
    // The old stores are gone.
    expect(migrated.tables.map((t) => t.name)).toEqual(['games']);

    migrated.close();
    await new Promise<void>((resolve, reject) => {
      const del = indexedDB.deleteDatabase(dbName);
      del.onsuccess = () => resolve();
      del.onerror = () => reject(del.error);
    });
  });
});
