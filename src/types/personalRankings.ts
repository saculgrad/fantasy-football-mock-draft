export interface RankingTier {
  id: string;
  name: string;
  playerIds: string[];
}

export interface PersonalRankings {
  tiers: RankingTier[];
  updatedAt: string;
}
