export type WinCondition = 'highest' | 'lowest';

export type GameStatus = 'active' | 'finished';

export interface Player {
  /** Stable id within a single game (not shared across games). */
  id: string;
  name: string;
}

export interface Round {
  /** 1-based round number, in play order. */
  index: number;
  /** playerId -> score earned this round */
  scores: Record<string, number>;
}

export interface Game {
  id?: number;
  name: string;
  players: Player[];
  rounds: Round[];
  winCondition: WinCondition;
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
}

export interface PlayerTotal {
  player: Player;
  total: number;
  rank: number;
  isWinner: boolean;
}
