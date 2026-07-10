// Offensive positions covered in v1. Extensible later for IDP (DL/LB/DB) without
// restructuring anything below — it's just a wider union feeding the same slot model.
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'DST' | 'K';

export const ALL_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];

// Shared "position tab" list (an 'ALL' option plus every position) - used by
// any UI that lets you filter a player list down to one position.
export const POSITION_FILTER_OPTIONS: Array<Position | 'ALL'> = ['ALL', ...ALL_POSITIONS];

// A roster is just an ordered list of slots. There's no dedicated "flex" or
// "superflex" concept in the type system — those are only ever a slot whose
// eligiblePositions happens to include more than one position. Any league
// shape (2QB, superflex, extra bench, etc.) is expressible as data here,
// with no code changes.
export interface RosterSlot {
  id: string;
  label: string;
  eligiblePositions: Position[];
  isBench?: boolean;
}

// Scoring is a sparse map of stat -> points per unit. Standard/Half-PPR/Full-PPR
// aren't distinct types, just different values for `rec` in this same map —
// any custom scoring system is expressible without new code.
export type StatKey =
  | 'passYds'
  | 'passTd'
  | 'passInt'
  | 'rushYds'
  | 'rushTd'
  | 'rec'
  | 'recYds'
  | 'recTd'
  | 'fumbleLost';

export type ScoringSettings = Partial<Record<StatKey, number>>;

export interface LeagueConfig {
  id: string;
  name: string;
  teamCount: number;
  rosterSlots: RosterSlot[];
  scoring: ScoringSettings;
  draftOrder: 'random' | 'manual';
}
