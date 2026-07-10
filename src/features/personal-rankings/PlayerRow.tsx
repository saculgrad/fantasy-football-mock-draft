import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Player } from '../../types/player';

interface PlayerRowProps {
  playerId: string;
  player: Player | undefined;
  onRemove: () => void;
}

export function PlayerRow({ playerId, player, onRemove }: PlayerRowProps) {
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
      <button type="button" className="player-row-remove" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}>
        ×
      </button>
    </li>
  );
}
