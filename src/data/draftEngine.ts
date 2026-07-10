import type { Position, RosterSlot } from '../types/league';
import type { Player, RankingEntry } from '../types/player';
import type { DraftPick, DraftState } from '../types/draft';

export function createDraftState(teamCount: number, totalRounds: number, yourTeamIndex: number): DraftState {
  return { teamCount, totalRounds, yourTeamIndex, picks: [], status: 'in_progress' };
}

export function roundForPick(pickNumber: number, teamCount: number): number {
  return Math.ceil(pickNumber / teamCount);
}

export function teamIndexForPick(pickNumber: number, teamCount: number): number {
  const round = roundForPick(pickNumber, teamCount);
  const indexInRound = (pickNumber - 1) % teamCount;
  return round % 2 === 1 ? indexInRound : teamCount - 1 - indexInRound;
}

export function currentPickNumber(state: DraftState): number {
  return state.picks.length + 1;
}

export function currentTeamIndex(state: DraftState): number {
  return teamIndexForPick(currentPickNumber(state), state.teamCount);
}

export function isYourTurn(state: DraftState): boolean {
  return state.status === 'in_progress' && currentTeamIndex(state) === state.yourTeamIndex;
}

export interface SlotAssignment {
  slot: RosterSlot;
  player: Player | null;
}

// Fills the most specific open slot first (fewest eligible positions, non-bench
// before bench) so e.g. a WR fills the dedicated WR slot before FLEX, and FLEX
// before bench. Reused for both bot need-detection and the "Your Roster" UI.
export function assignRosterSlots(rosterSlots: RosterSlot[], draftedPlayers: Player[]): SlotAssignment[] {
  const order = rosterSlots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => {
      if (!!a.slot.isBench !== !!b.slot.isBench) return a.slot.isBench ? 1 : -1;
      if (a.slot.eligiblePositions.length !== b.slot.eligiblePositions.length) {
        return a.slot.eligiblePositions.length - b.slot.eligiblePositions.length;
      }
      return a.index - b.index;
    });

  const remaining = [...draftedPlayers];
  const bySlotId = new Map<string, Player | null>();

  for (const { slot } of order) {
    const playerIndex = remaining.findIndex((p) => slot.eligiblePositions.includes(p.position));
    if (playerIndex === -1) {
      bySlotId.set(slot.id, null);
      continue;
    }
    bySlotId.set(slot.id, remaining[playerIndex]);
    remaining.splice(playerIndex, 1);
  }

  return rosterSlots.map((slot) => ({ slot, player: bySlotId.get(slot.id) ?? null }));
}

const BOT_TOP_N = 5;
const BOT_WEIGHTS = [0.55, 0.22, 0.12, 0.07, 0.04];
const BOT_BENCH_BUFFER = 2;

interface PickForBotParams {
  teamIndex: number;
  state: DraftState;
  rosterSlots: RosterSlot[];
  players: Player[];
  rankings: RankingEntry[];
}

// Weighted-random over public ADP/consensus rank, restricted to positions the
// team still has an open slot for, with a soft cap so a bot won't hoard a
// position well beyond what its roster can use. Heavily favors the top
// consensus option but not always - "smart but not genius," never targets
// other teams since it only ever looks at its own open slots.
export function pickForBot({ teamIndex, state, rosterSlots, players, rankings }: PickForBotParams): string | null {
  const playersById = new Map(players.map((p) => [p.sleeperId, p]));
  const draftedIds = new Set(state.picks.map((p) => p.sleeperId));

  const teamDraftedPlayers = state.picks
    .filter((p) => p.teamIndex === teamIndex)
    .map((p) => playersById.get(p.sleeperId))
    .filter((p): p is Player => !!p);

  const openSlots = assignRosterSlots(rosterSlots, teamDraftedPlayers)
    .filter((a) => a.player === null)
    .map((a) => a.slot);
  if (openSlots.length === 0) return null;

  const openPositions = new Set(openSlots.flatMap((s) => s.eligiblePositions));

  const dedicatedSlotCount = (position: Position) =>
    rosterSlots.filter((s) => !s.isBench && s.eligiblePositions.length === 1 && s.eligiblePositions[0] === position)
      .length;

  const draftedCountByPosition = new Map<Position, number>();
  for (const p of teamDraftedPlayers) {
    draftedCountByPosition.set(p.position, (draftedCountByPosition.get(p.position) ?? 0) + 1);
  }
  const isCapped = (position: Position) =>
    (draftedCountByPosition.get(position) ?? 0) >= dedicatedSlotCount(position) + BOT_BENCH_BUFFER;

  const isEligible = (r: RankingEntry): r is RankingEntry & { sleeperId: string } =>
    r.sleeperId !== null && !draftedIds.has(r.sleeperId) && openPositions.has(r.position);

  let candidates = rankings.filter((r): r is RankingEntry & { sleeperId: string } => isEligible(r) && !isCapped(r.position));
  if (candidates.length === 0) {
    candidates = rankings.filter(isEligible);
  }
  if (candidates.length === 0) return null;

  const pool = [...candidates].sort((a, b) => a.ecr - b.ecr).slice(0, BOT_TOP_N);
  const weights = BOT_WEIGHTS.slice(0, pool.length);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i].sleeperId;
  }
  return pool[pool.length - 1].sleeperId;
}

export function applyPick(state: DraftState, teamIndex: number, sleeperId: string): DraftState {
  const pickNumber = currentPickNumber(state);
  const pick: DraftPick = { pickNumber, round: roundForPick(pickNumber, state.teamCount), teamIndex, sleeperId };
  const picks = [...state.picks, pick];
  const status = picks.length === state.teamCount * state.totalRounds ? 'complete' : 'in_progress';
  return { ...state, picks, status };
}

export function undoLastPick(state: DraftState): DraftState {
  if (state.picks.length === 0) return state;
  return { ...state, picks: state.picks.slice(0, -1), status: 'in_progress' };
}
