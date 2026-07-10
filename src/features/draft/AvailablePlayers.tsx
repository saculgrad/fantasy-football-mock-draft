import { useMemo, useState } from 'react';
import type { RankingEntry, Player } from '../../types/player';
import type { Position } from '../../types/league';

interface AvailablePlayersProps {
  rankings: RankingEntry[];
  playersById: Map<string, Player>;
  draftedIds: Set<string>;
  canDraft: boolean;
  openPositions: Set<Position>;
  onDraft: (sleeperId: string) => void;
}

const POSITION_FILTERS: Array<Position | 'ALL'> = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DST', 'K'];

export function AvailablePlayers({
  rankings,
  playersById,
  draftedIds,
  canDraft,
  openPositions,
  onDraft,
}: AvailablePlayersProps) {
  const [filter, setFilter] = useState<Position | 'ALL'>('ALL');

  const available = useMemo(
    () =>
      rankings
        .filter(
          (r): r is RankingEntry & { sleeperId: string } => r.sleeperId !== null && !draftedIds.has(r.sleeperId),
        )
        .filter((r) => filter === 'ALL' || r.position === filter)
        .sort((a, b) => a.ecr - b.ecr)
        .slice(0, 50),
    [rankings, draftedIds, filter],
  );

  return (
    <div className="available-players">
      <h3>Available players</h3>
      <div className="position-filters">
        {POSITION_FILTERS.map((pos) => (
          <button
            key={pos}
            type="button"
            className={filter === pos ? 'position-filter active' : 'position-filter'}
            onClick={() => setFilter(pos)}
          >
            {pos}
          </button>
        ))}
      </div>
      <ul className="available-players-list">
        {available.map((r) => {
          const player = playersById.get(r.sleeperId);
          const noOpenSlot = !openPositions.has(r.position);
          return (
            <li key={r.sleeperId} className="available-players-row">
              <span>
                {player?.name ?? r.playerName} ({r.position}
                {r.team ? `, ${r.team}` : ''}){noOpenSlot && <span className="hint"> — no open slot</span>}
              </span>
              <button type="button" disabled={!canDraft || noOpenSlot} onClick={() => onDraft(r.sleeperId)}>
                Draft
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
