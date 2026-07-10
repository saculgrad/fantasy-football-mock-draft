export interface DraftPick {
  pickNumber: number;
  round: number;
  teamIndex: number;
  sleeperId: string;
}

export interface DraftState {
  teamCount: number;
  totalRounds: number;
  yourTeamIndex: number;
  picks: DraftPick[];
  status: 'in_progress' | 'complete';
}
