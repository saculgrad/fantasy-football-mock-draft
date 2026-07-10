import { parseCsv } from './csv';
import type { Position } from '../types/league';

const FPECR_LATEST_URL =
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_fpecr_latest.csv';
const PLAYER_IDS_URL =
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv';

export interface ConsensusRankingRow {
  fantasyProsId: string;
  playerName: string;
  position: Position;
  team: string | null;
  ecr: number;
  mergeName: string;
}

export async function fetchConsensusRankings(): Promise<ConsensusRankingRow[]> {
  const res = await fetch(FPECR_LATEST_URL);
  if (!res.ok) throw new Error(`FantasyPros rankings fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCsv(text);

  // 'redraft-overall' is the one board covering QB/RB/WR/TE/K/DST together with
  // an ecr (expert consensus rank) we use as our ADP proxy - see plan for why
  // the other ecr_type/page_type combinations (dynasty, best-ball, IDP, positional
  // cheatsheets) aren't what we want here.
  return rows
    .filter((row) => row.page_type === 'redraft-overall')
    .map((row) => ({
      fantasyProsId: row.id,
      playerName: row.player,
      position: row.pos as Position,
      team: row.team && row.team !== 'NA' ? row.team : null,
      ecr: Number(row.ecr),
      mergeName: row.mergename,
    }))
    .filter((row) => Number.isFinite(row.ecr));
}

export interface IdCrosswalk {
  byFantasyProsId: Map<string, string>;
  byNameAndPosition: Map<string, string>;
}

// db_playerids.csv labels kickers 'PK'; db_fpecr_latest.csv (and our app) use 'K'.
const CROSSWALK_POSITION_TO_APP: Partial<Record<string, Position>> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  PK: 'K',
};

function normalizeKey(name: string, position: string): string {
  return `${name.toLowerCase().replace(/[^a-z]/g, '')}|${position}`;
}

export async function fetchIdCrosswalk(): Promise<IdCrosswalk> {
  const res = await fetch(PLAYER_IDS_URL);
  if (!res.ok) throw new Error(`Player ID crosswalk fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCsv(text);

  const byFantasyProsId = new Map<string, string>();
  const byNameAndPosition = new Map<string, string>();

  for (const row of rows) {
    const sleeperId = row.sleeper_id;
    if (!sleeperId || sleeperId === 'NA') continue;

    if (row.fantasypros_id && row.fantasypros_id !== 'NA') {
      byFantasyProsId.set(row.fantasypros_id, sleeperId);
    }

    const appPosition = CROSSWALK_POSITION_TO_APP[row.position];
    if (row.merge_name && appPosition) {
      byNameAndPosition.set(normalizeKey(row.merge_name, appPosition), sleeperId);
    }
  }

  return { byFantasyProsId, byNameAndPosition };
}

export { normalizeKey };
