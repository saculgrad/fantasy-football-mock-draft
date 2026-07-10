import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { RankingTier } from '../../types/personalRankings';
import type { Player } from '../../types/player';
import { PlayerRow } from './PlayerRow';

interface TierColumnProps {
  tier: RankingTier;
  allTiers: RankingTier[];
  playersById: Map<string, Player>;
  onRename: (name: string) => void;
  onDelete: () => void;
  onRemovePlayer: (playerId: string) => void;
  onMovePlayer: (playerId: string, direction: 'up' | 'down') => void;
  onMovePlayerToTier: (playerId: string, targetTierId: string) => void;
}

export function TierColumn({
  tier,
  allTiers,
  playersById,
  onRename,
  onDelete,
  onRemovePlayer,
  onMovePlayer,
  onMovePlayerToTier,
}: TierColumnProps) {
  const { setNodeRef } = useDroppable({ id: tier.id });
  const otherTiers = allTiers.filter((t) => t.id !== tier.id);

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
          {tier.playerIds.map((playerId, index) => (
            <PlayerRow
              key={playerId}
              playerId={playerId}
              player={playersById.get(playerId)}
              otherTiers={otherTiers}
              canMoveUp={index > 0}
              canMoveDown={index < tier.playerIds.length - 1}
              onRemove={() => onRemovePlayer(playerId)}
              onMoveUp={() => onMovePlayer(playerId, 'up')}
              onMoveDown={() => onMovePlayer(playerId, 'down')}
              onMoveToTier={(targetTierId) => onMovePlayerToTier(playerId, targetTierId)}
            />
          ))}
          {tier.playerIds.length === 0 && <li className="tier-empty-hint">Drop players here</li>}
        </ul>
      </SortableContext>
    </div>
  );
}
