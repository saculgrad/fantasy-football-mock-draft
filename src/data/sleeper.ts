import type { Player } from '../types/player';
import type { Position } from '../types/league';

const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';

// Sleeper labels team defenses 'DEF'; our app uses 'DST' to match the more
// common fantasy-platform convention (also what dynastyprocess uses natively).
const SLEEPER_POSITION_TO_APP: Partial<Record<string, Position>> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  K: 'K',
  DEF: 'DST',
};

interface SleeperPlayerRaw {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  status?: string | null;
  injury_status?: string | null;
}

export async function fetchSleeperPlayers(): Promise<Player[]> {
  const res = await fetch(SLEEPER_PLAYERS_URL);
  if (!res.ok) throw new Error(`Sleeper players fetch failed: ${res.status}`);
  const raw: Record<string, SleeperPlayerRaw> = await res.json();

  const players: Player[] = [];
  for (const p of Object.values(raw)) {
    const position = p.position ? SLEEPER_POSITION_TO_APP[p.position] : undefined;
    if (!position) continue;
    const name = p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(' ');
    if (!name) continue;
    players.push({
      sleeperId: p.player_id,
      name,
      position,
      team: p.team ?? null,
      status: p.status ?? null,
      injuryStatus: p.injury_status ?? null,
    });
  }
  return players;
}
