import { ALL_POSITIONS, type Position, type RosterSlot } from '../types/league';
import type { Player, PlayerDataSnapshot, RankingEntry } from '../types/player';
import type { DraftPick, DraftState } from '../types/draft';
import { assignRosterSlots } from './draftEngine';

// Starters count far more than bench, per the request - bench still has some
// value (depth), it just shouldn't move the grade much.
const STARTER_WEIGHT = 1.0;
const BENCH_WEIGHT = 0.3;

// Relative fantasy value/scoring-share by position. We don't have real point
// projections to derive this empirically, so it's a documented constant
// reflecting standard fantasy consensus: RB/WR carry the most weekly points
// and roster slots, QB is valuable but usually just one starter, TE/DST/K
// contribute less on average and are more replaceable.
const POSITION_WEIGHTS: Record<Position, number> = {
  RB: 1.0,
  WR: 1.0,
  QB: 0.85,
  TE: 0.75,
  DST: 0.45,
  K: 0.4,
};

// Slight, as requested - a couple of clustered bye starters or injury-flagged
// starters should nudge the grade, not swing it.
const BYE_PENALTY_UNIT = 2;
const INJURY_PENALTY_UNIT = 1.5;

// Percentile is uniformly distributed across teams by construction (it's a
// rank), unlike a school percentage score - so thresholds copied from an
// academic scale (90+=A, <60=F) would fail half the league. These 12 bands
// split the 0-100 range evenly instead, so an average (50th percentile) team
// lands mid-scale (B-) rather than at the bottom.
const GRADE_THRESHOLDS: Array<[number, string]> = [
  [92, 'A+'],
  [83, 'A'],
  [75, 'A-'],
  [67, 'B+'],
  [58, 'B'],
  [50, 'B-'],
  [42, 'C+'],
  [33, 'C'],
  [25, 'C-'],
  [17, 'D+'],
  [8, 'D'],
  [0, 'F'],
];

export interface PositionGrade {
  position: Position;
  yourScore: number;
  rank: number;
  teamCount: number;
  percentile: number;
}

export interface DraftGradeResult {
  letterGrade: string;
  overallPercentile: number;
  positionGrades: PositionGrade[];
  byeWeekNote: string | null;
  injuryRiskNote: string | null;
}

// Reciprocal rather than linear so rank 1 vs rank 2 matters far more than
// rank 300 vs 301 - matches how fantasy value actually decays.
function playerValue(ecr: number): number {
  return 1000 / ecr;
}

function draftedPlayersForTeam(teamIndex: number, picks: DraftPick[], playersById: Map<string, Player>): Player[] {
  return picks
    .filter((p) => p.teamIndex === teamIndex)
    .map((p) => playersById.get(p.sleeperId))
    .filter((p): p is Player => !!p);
}

function computeOverallScore(positionScores: Partial<Record<Position, number>>): number {
  return ALL_POSITIONS.reduce((sum, pos) => sum + (positionScores[pos] ?? 0) * POSITION_WEIGHTS[pos], 0);
}

function computeByeWeekPenalty(starters: Player[], rankingsBySleeperId: Map<string, RankingEntry>): number {
  const byWeek = new Map<number, number>();
  for (const p of starters) {
    const bye = rankingsBySleeperId.get(p.sleeperId)?.bye;
    if (bye == null) continue;
    byWeek.set(bye, (byWeek.get(bye) ?? 0) + 1);
  }
  let penalty = 0;
  for (const count of byWeek.values()) {
    if (count >= 2) penalty += (count - 1) ** 2 * BYE_PENALTY_UNIT;
  }
  return penalty;
}

function computeInjuryPenalty(starters: Player[]): number {
  return starters.filter((p) => p.injuryStatus).length * INJURY_PENALTY_UNIT;
}

function describeByeWeekClusters(starters: Player[], rankingsBySleeperId: Map<string, RankingEntry>): string | null {
  const byWeek = new Map<number, string[]>();
  for (const p of starters) {
    const bye = rankingsBySleeperId.get(p.sleeperId)?.bye;
    if (bye == null) continue;
    byWeek.set(bye, [...(byWeek.get(bye) ?? []), p.name]);
  }
  const clusters = Array.from(byWeek.entries())
    .filter(([, names]) => names.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
  if (clusters.length === 0) return null;
  const [week, names] = clusters[0];
  return `${names.length} starters share a Week ${week} bye (${names.join(', ')}).`;
}

function describeInjuryRisk(starters: Player[]): string | null {
  const flagged = starters.filter((p) => p.injuryStatus);
  if (flagged.length === 0) return null;
  const names = flagged.map((p) => `${p.name} (${p.injuryStatus})`).join(', ');
  return `${flagged.length} starter${flagged.length === 1 ? '' : 's'} carrying an injury designation: ${names}.`;
}

function computeRank(yourScore: number, allScores: number[]): number {
  return 1 + allScores.filter((s) => s > yourScore).length;
}

function computePercentile(rank: number, teamCount: number): number {
  if (teamCount <= 1) return 100;
  return Math.round((100 * (teamCount - rank)) / (teamCount - 1));
}

function gradeForPercentile(percentile: number): string {
  for (const [min, grade] of GRADE_THRESHOLDS) {
    if (percentile >= min) return grade;
  }
  return 'F';
}

interface TeamComputation {
  positionScores: Partial<Record<Position, number>>;
  overallScore: number;
  starters: Player[];
}

function computeTeam(
  teamIndex: number,
  picks: DraftPick[],
  rosterSlots: RosterSlot[],
  playersById: Map<string, Player>,
  rankingsBySleeperId: Map<string, RankingEntry>,
): TeamComputation {
  const draftedPlayers = draftedPlayersForTeam(teamIndex, picks, playersById);
  const assignments = assignRosterSlots(rosterSlots, draftedPlayers);

  const positionScores: Partial<Record<Position, number>> = {};
  const starters: Player[] = [];
  for (const { slot, player } of assignments) {
    if (!player) continue;
    if (!slot.isBench) starters.push(player);
    const ranking = rankingsBySleeperId.get(player.sleeperId);
    if (!ranking) continue;
    const weight = slot.isBench ? BENCH_WEIGHT : STARTER_WEIGHT;
    positionScores[player.position] = (positionScores[player.position] ?? 0) + playerValue(ranking.ecr) * weight;
  }

  const overallScore =
    computeOverallScore(positionScores) -
    computeByeWeekPenalty(starters, rankingsBySleeperId) -
    computeInjuryPenalty(starters);

  return { positionScores, overallScore, starters };
}

export function computeTeamGrade(
  teamIndex: number,
  draftState: DraftState,
  rosterSlots: RosterSlot[],
  playerData: PlayerDataSnapshot,
): DraftGradeResult {
  const playersById = new Map(playerData.players.map((p) => [p.sleeperId, p]));
  const rankingsBySleeperId = new Map(
    playerData.rankings
      .filter((r): r is RankingEntry & { sleeperId: string } => r.sleeperId !== null)
      .map((r) => [r.sleeperId, r]),
  );

  const teams = Array.from({ length: draftState.teamCount }, (_, t) =>
    computeTeam(t, draftState.picks, rosterSlots, playersById, rankingsBySleeperId),
  );

  const you = teams[teamIndex];

  const positionGrades: PositionGrade[] = ALL_POSITIONS.map((position) => {
    const scoresForPosition = teams.map((t) => t.positionScores[position] ?? 0);
    const yourScore = you.positionScores[position] ?? 0;
    const rank = computeRank(yourScore, scoresForPosition);
    return {
      position,
      yourScore,
      rank,
      teamCount: draftState.teamCount,
      percentile: computePercentile(rank, draftState.teamCount),
    };
  });

  const overallScores = teams.map((t) => t.overallScore);
  const overallRank = computeRank(you.overallScore, overallScores);
  const overallPercentile = computePercentile(overallRank, draftState.teamCount);

  return {
    letterGrade: gradeForPercentile(overallPercentile),
    overallPercentile,
    positionGrades,
    byeWeekNote: describeByeWeekClusters(you.starters, rankingsBySleeperId),
    injuryRiskNote: describeInjuryRisk(you.starters),
  };
}
