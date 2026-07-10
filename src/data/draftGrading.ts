import { ALL_POSITIONS, type Position, type RosterSlot } from '../types/league';
import type { Player, PlayerDataSnapshot, RankingEntry } from '../types/player';
import type { DraftPick, DraftState } from '../types/draft';
import { assignRosterSlots } from './draftEngine';

// Starters count far more than bench, per the request - bench still has some
// value (depth), it just shouldn't move the grade much.
const STARTER_WEIGHT = 1.0;
const BENCH_WEIGHT = 0.3;

// Relative positional value, derived empirically (not guessed) from the same
// FantasyPros consensus ECR data this app already fetches: for each position,
// computed value(best player) / value(12th-best player) - i.e. how much
// better the best option is than a replacement-level 12-team starter, using
// this file's own 1000/ecr value function. Results: WR 14.1x, RB 11.9x,
// TE 6.1x, QB 3.7x, DST 1.35x, K 1.22x. Cross-checked against published
// Value-Based Drafting (VBD) research (FantasyPros VBD methodology, PFF's
// 10-year kicker-predictability study showing R²=0.204 year-over-year) which
// corroborates the same ordering and flatness of K/DST. QB's low spread in
// particular matches VBD literature calling the QB1-to-QB12 gap "essentially
// nothing" in single-QB formats - drafting skill barely shows up at QB here,
// so it shouldn't be weighted like it does.
const POSITION_WEIGHTS: Record<Position, number> = {
  RB: 1.0,
  WR: 1.0,
  TE: 0.5,
  QB: 0.35,
  DST: 0.12,
  K: 0.08,
};

// FUTURE WORK: these weights are a single static table, tuned for a standard
// single-QB, PPR-agnostic league. They don't currently respond to the
// league's actual configuration (LeagueConfig), which they should eventually:
//   - PPR level: reception scoring (LeagueConfig.scoring.rec) directly boosts
//     pass-catching RBs/WRs/TEs relative to non-PPR - the "12th-best" cutoff
//     and thus the spread ratio for each position would shift with it. A
//     0-PPR league would likely narrow the WR spread and widen RB's.
//   - Superflex / 2QB (a second QB-eligible starting slot): QB's spread ratio
//     above was measured against a 12-team, 1-QB-per-team replacement level.
//     With two starting QB slots per team, the replacement level drops much
//     further down the QB pool, which historically increases QB's spread
//     dramatically (this is the entire premise of "superflex" as a format -
//     QB weight would need to rise substantially, likely close to RB/WR).
//   - TE premium (extra points per reception for tight ends specifically):
//     would directly increase TE's value spread beyond the 6.1x measured
//     here under standard scoring.
//   - Roster shape generally (e.g. 3WR instead of 2WR+FLEX, or extra RB/WR
//     flex slots): changes how deep into each position's rank a "replacement
//     level starter" actually is, which is the denominator of the spread
//     ratio - the whole computation, not just the scoring, would need to
//     reflect actual rosterSlots composition per position, not a fixed "12th
//     starter" assumption.
// The general fix is to derive POSITION_WEIGHTS the same way it was derived
// here - value(best) / value(replacement level) - but computed dynamically
// per league from the current LeagueConfig.scoring and LeagueConfig.rosterSlots
// (which already tell us exactly how many starters are needed at each
// position, so the "replacement level" rank is knowable per league instead of
// assumed at 12) rather than hardcoded once for a standard league shape.

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
