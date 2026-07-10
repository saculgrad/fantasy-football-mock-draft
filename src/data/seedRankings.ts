import type { PlayerDataSnapshot } from '../types/player';
import type { PersonalRankings } from '../types/personalRankings';

export function seedFromPublicRankings(snapshot: PlayerDataSnapshot): PersonalRankings {
  const playerIds = snapshot.rankings
    .filter((r): r is typeof r & { sleeperId: string } => r.sleeperId !== null)
    .slice()
    .sort((a, b) => a.ecr - b.ecr)
    .map((r) => r.sleeperId);

  return {
    tiers: [{ id: `tier-${Date.now()}`, name: 'Tier 1', playerIds }],
    updatedAt: new Date().toISOString(),
  };
}
