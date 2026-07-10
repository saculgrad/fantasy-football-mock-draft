import type { PlayerDataSnapshot, RankingEntry } from '../types/player';
import { fetchSleeperPlayers } from './sleeper';
import { fetchConsensusRankings, fetchIdCrosswalk, normalizeKey } from './fantasypros';

// dynastyprocess/FantasyPros label Jacksonville 'JAC'; Sleeper uses 'JAX'. Verified
// this is the only team-code mismatch between the two sources.
const TEAM_CODE_ALIASES: Record<string, string> = { JAC: 'JAX' };

function normalizeTeamCode(team: string | null): string | null {
  if (!team) return null;
  return TEAM_CODE_ALIASES[team] ?? team;
}

export async function buildPlayerDataSnapshot(): Promise<PlayerDataSnapshot> {
  const [players, consensusRows, crosswalk] = await Promise.all([
    fetchSleeperPlayers(),
    fetchConsensusRankings(),
    fetchIdCrosswalk(),
  ]);

  // Sleeper's player_id for a team defense *is* the team's abbreviation, so DST
  // matching doesn't need the crosswalk file at all - just confirm Sleeper has
  // that team code as a DST entry.
  const dstTeamCodes = new Set(players.filter((p) => p.position === 'DST').map((p) => p.sleeperId));

  const rankings: RankingEntry[] = consensusRows.map((row) => {
    const team = normalizeTeamCode(row.team);
    let sleeperId: string | null = null;

    if (row.position === 'DST') {
      sleeperId = team && dstTeamCodes.has(team) ? team : null;
    } else {
      sleeperId =
        crosswalk.byFantasyProsId.get(row.fantasyProsId) ??
        crosswalk.byNameAndPosition.get(normalizeKey(row.mergeName, row.position)) ??
        null;
    }

    return {
      sleeperId,
      playerName: row.playerName,
      position: row.position,
      team,
      ecr: row.ecr,
    };
  });

  return {
    fetchedAt: new Date().toISOString(),
    players,
    rankings,
  };
}
