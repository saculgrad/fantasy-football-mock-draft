import { parseCsv } from './csv';
import type { Player } from '../types/player';
import type { RankingTier } from '../types/personalRankings';

export interface CsvImportResult {
  tiers: RankingTier[];
  matchedCount: number;
  unmatchedNames: string[];
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function findHeaderKey(row: Record<string, string>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  return keys.find((k) => candidates.includes(k.trim().toLowerCase()));
}

export function parseRankingCsv(text: string, players: Player[]): CsvImportResult {
  const rows = parseCsv(text);

  const byNamePosition = new Map<string, string>();
  const byName = new Map<string, string[]>();
  for (const p of players) {
    const n = normalizeName(p.name);
    byNamePosition.set(`${n}|${p.position}`, p.sleeperId);
    byName.set(n, [...(byName.get(n) ?? []), p.sleeperId]);
  }

  const nameKey = rows.length > 0 ? findHeaderKey(rows[0], ['name', 'player', 'player_name']) : undefined;
  const tierKey = rows.length > 0 ? findHeaderKey(rows[0], ['tier', 'tier_name']) : undefined;
  const positionKey = rows.length > 0 ? findHeaderKey(rows[0], ['position', 'pos']) : undefined;

  const tiersByName = new Map<string, RankingTier>();
  const unmatchedNames: string[] = [];
  let matchedCount = 0;
  let tierCounter = 1;

  for (const row of rows) {
    const rawName = nameKey ? row[nameKey]?.trim() : undefined;
    if (!rawName) continue;

    const normalized = normalizeName(rawName);
    const rawPosition = positionKey ? row[positionKey]?.trim().toUpperCase() : undefined;

    let sleeperId = rawPosition ? byNamePosition.get(`${normalized}|${rawPosition}`) : undefined;
    if (!sleeperId) {
      const candidates = byName.get(normalized);
      if (candidates && candidates.length === 1) sleeperId = candidates[0];
    }

    if (!sleeperId) {
      unmatchedNames.push(rawName);
      continue;
    }

    const tierName = (tierKey ? row[tierKey]?.trim() : '') || 'Tier 1';
    let tier = tiersByName.get(tierName);
    if (!tier) {
      tier = { id: `tier-${Date.now()}-${tierCounter++}`, name: tierName, playerIds: [] };
      tiersByName.set(tierName, tier);
    }
    tier.playerIds.push(sleeperId);
    matchedCount++;
  }

  return { tiers: Array.from(tiersByName.values()), matchedCount, unmatchedNames };
}
