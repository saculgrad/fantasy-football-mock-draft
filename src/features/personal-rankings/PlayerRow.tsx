import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Player } from '../../types/player';
import type { RankingTier } from '../../types/personalRankings';

interface PlayerRowProps {
  playerId: string;
  player: Player | undefined;
  otherTiers?: RankingTier[];
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveToTier?: (targetTierId: string) => void;
}

export function PlayerRow({
  playerId,
  player,
  otherTiers = [],
  canMoveUp = false,
  canMoveDown = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveToTier,
}: PlayerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: playerId });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="player-row" {...attributes} {...listeners}>
      <span className="player-row-name">{player?.name ?? `Unknown player (${playerId})`}</span>
      {player && (
        <span className="player-row-meta">
          {player.position} · {player.team ?? 'FA'}
        </span>
      )}
      {(onMoveUp || onMoveDown) && (
        <span className="player-row-move-buttons">
          <button
            type="button"
            className="player-row-move-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up within tier"
          >
            ▲
          </button>
          <button
            type="button"
            className="player-row-move-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down within tier"
          >
            ▼
          </button>
        </span>
      )}
      {onMoveToTier && otherTiers.length > 0 && (
        <select
          className="player-row-move-to-tier"
          value=""
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            if (e.target.value) onMoveToTier(e.target.value);
          }}
        >
          <option value="">Move to tier…</option>
          {otherTiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="player-row-remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
      >
        ×
      </button>
    </li>
  );
}
