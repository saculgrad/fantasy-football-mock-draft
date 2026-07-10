import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { RankingTier } from '../../types/personalRankings';
import type { Player } from '../../types/player';
import { PlayerRow } from './PlayerRow';

interface TierColumnProps {
  tier: RankingTier;
  playersById: Map<string, Player>;
  onRename: (name: string) => void;
  onDelete: () => void;
  onRemovePlayer: (playerId: string) => void;
}

export function TierColumn({ tier, playersById, onRename, onDelete, onRemovePlayer }: TierColumnProps) {
  const { setNodeRef } = useDroppable({ id: tier.id });

  return (
    <div className="tier-column">
      <div className="tier-column-header">
        <input type="text" value={tier.name} onChange={(e) => onRename(e.target.value)} />
        <button type="button" onClick={onDelete}>
          Delete tier
        </button>
      </div>
      <SortableContext items={tier.playerIds} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="tier-player-list">
          {tier.playerIds.map((playerId) => (
            <PlayerRow
              key={playerId}
              playerId={playerId}
              player={playersById.get(playerId)}
              onRemove={() => onRemovePlayer(playerId)}
            />
          ))}
          {tier.playerIds.length === 0 && <li className="tier-empty-hint">Drop players here</li>}
        </ul>
      </SortableContext>
    </div>
  );
}
