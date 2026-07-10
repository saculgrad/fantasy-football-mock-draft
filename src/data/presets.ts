import type { LeagueConfig, RosterSlot, ScoringSettings } from '../types/league';

function slot(label: string, eligiblePositions: RosterSlot['eligiblePositions'], isBench = false): Omit<RosterSlot, 'id'> {
  return { label, eligiblePositions, isBench };
}

// The standard slot layout. Nothing here is special-cased in the type system —
// it's just one particular list of RosterSlot data among infinitely many possible ones.
const STANDARD_ROSTER_SHAPE: Array<Omit<RosterSlot, 'id'>> = [
  slot('QB', ['QB']),
  slot('RB', ['RB']),
  slot('RB', ['RB']),
  slot('WR', ['WR']),
  slot('WR', ['WR']),
  slot('TE', ['TE']),
  slot('FLEX', ['RB', 'WR', 'TE']),
  slot('DST', ['DST']),
  slot('K', ['K']),
  slot('BENCH', ['QB', 'RB', 'WR', 'TE', 'DST', 'K'], true),
  slot('BENCH', ['QB', 'RB', 'WR', 'TE', 'DST', 'K'], true),
  slot('BENCH', ['QB', 'RB', 'WR', 'TE', 'DST', 'K'], true),
  slot('BENCH', ['QB', 'RB', 'WR', 'TE', 'DST', 'K'], true),
  slot('BENCH', ['QB', 'RB', 'WR', 'TE', 'DST', 'K'], true),
  slot('BENCH', ['QB', 'RB', 'WR', 'TE', 'DST', 'K'], true),
];

const BASE_SCORING: ScoringSettings = {
  passYds: 0.04, // 1 pt / 25 yds
  passTd: 4,
  passInt: -2,
  rushYds: 0.1, // 1 pt / 10 yds
  rushTd: 6,
  recYds: 0.1,
  recTd: 6,
  fumbleLost: -2,
};

export const SCORING_PRESETS = {
  standard: { ...BASE_SCORING, rec: 0 },
  'half-ppr': { ...BASE_SCORING, rec: 0.5 },
  'full-ppr': { ...BASE_SCORING, rec: 1 },
} satisfies Record<string, ScoringSettings>;

export type ScoringPresetKey = keyof typeof SCORING_PRESETS;

export const SCORING_PRESET_LABELS: Record<ScoringPresetKey, string> = {
  standard: 'Standard',
  'half-ppr': 'Half PPR',
  'full-ppr': 'Full PPR',
};

let nextSlotId = 1;
function freshRosterSlots(): RosterSlot[] {
  return STANDARD_ROSTER_SHAPE.map((s) => ({ ...s, id: `slot-${nextSlotId++}` }));
}

export function createPresetLeagueConfig(scoringPreset: ScoringPresetKey, teamCount = 10): LeagueConfig {
  return {
    id: `league-${Date.now()}`,
    name: `${SCORING_PRESET_LABELS[scoringPreset]} — ${teamCount} teams`,
    teamCount,
    rosterSlots: freshRosterSlots(),
    scoring: { ...SCORING_PRESETS[scoringPreset] },
    draftOrder: 'random',
  };
}
