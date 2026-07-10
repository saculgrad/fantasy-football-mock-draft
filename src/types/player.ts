import type { Position } from './league';

export interface Player {
  sleeperId: string;
  name: string;
  position: Position;
  team: string | null;
  status: string | null;
  injuryStatus: string | null;
}

export interface RankingEntry {
  // null only for the small unmatched tail that couldn't be crosswalked to a Sleeper player
  sleeperId: string | null;
  playerName: string;
  position: Position;
  team: string | null;
  ecr: number;
  bye: number | null;
}

export interface PlayerDataSnapshot {
  fetchedAt: string;
  players: Player[];
  rankings: RankingEntry[];
}
