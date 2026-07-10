import { useState } from 'react';
import type { PersonalRankings } from '../../types/personalRankings';
import type { Player } from '../../types/player';
import { POSITION_FILTER_OPTIONS, type Position } from '../../types/league';

interface YourQueueProps {
  personalRankings: PersonalRankings | null;
  playersById: Map<string, Player>;
  draftedIds: Set<string>;
  canDraft: boolean;
  openPositions: Set<Position>;
  onDraft: (sleeperId: string) => void;
}

const MAX_ROWS_PER_TIER = 15;

export function YourQueue({
  personalRankings,
  playersById,
  draftedIds,
  canDraft,
  openPositions,
  onDraft,
}: YourQueueProps) {
  const [filter, setFilter] = useState<Position | 'ALL'>('ALL');

  if (!personalRankings || personalRankings.tiers.length === 0) {
    return (
      <div className="your-queue">
        <h3>Your queue</h3>
        <p className="hint">No personal rankings saved yet.</p>
      </div>
    );
  }

  const visibleTiers = personalRankings.tiers
    .map((tier) => ({
      tier,
      available: tier.playerIds
        .filter((id) => !draftedIds.has(id))
        .filter((id) => filter === 'ALL' || playersById.get(id)?.position === filter),
    }))
    .filter(({ available }) => available.length > 0);

  return (
    <div className="your-queue">
      <h3>Your queue</h3>
      <div className="position-filters">
        {POSITION_FILTER_OPTIONS.map((pos) => (
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
      {visibleTiers.length === 0 && <p className="hint">No {filter === 'ALL' ? '' : `${filter} `}players left in your queue.</p>}
      {visibleTiers.map(({ tier, available }) => {
        const shown = available.slice(0, MAX_ROWS_PER_TIER);
        const remaining = available.length - shown.length;
        return (
          <div key={tier.id} className="your-queue-tier">
            <h4>{tier.name}</h4>
            <ul>
              {shown.map((id) => {
                const player = playersById.get(id);
                const noOpenSlot = !!player && !openPositions.has(player.position);
                return (
                  <li key={id} className="your-queue-row">
                    <span>
                      {player ? `${player.name} (${player.position}${player.team ? `, ${player.team}` : ''})` : id}
                      {noOpenSlot && <span className="hint"> — no open slot</span>}
                    </span>
                    <button type="button" disabled={!canDraft || noOpenSlot} onClick={() => onDraft(id)}>
                      Draft
                    </button>
                  </li>
                );
              })}
            </ul>
            {remaining > 0 && <p className="hint">+{remaining} more in this tier</p>}
          </div>
        );
      })}
    </div>
  );
}
