export type WinCondition = 'highest' | 'lowest';

export type GameStatus = 'active' | 'finished';

export interface Player {
  /** Stable id within a single game (not shared across games). */
  id: string;
  name: string;
}

export interface Game {
  id?: number;
  name: string;
  players: Player[];
  winCondition: WinCondition;
  status: GameStatus;
  createdAt: number;
  finishedAt?: number;
}

export interface Round {
  id?: number;
  gameId: number;
  /** 1-based round number, in play order. */
  index: number;
  /** playerId -> score earned this round */
  scores: Record<string, number>;
  createdAt: number;
}

export interface RecentPlayer {
  name: string;
  lastUsedAt: number;
  timesUsed: number;
}

export interface PlayerTotal {
  player: Player;
  total: number;
  rank: number;
  isWinner: boolean;
}
