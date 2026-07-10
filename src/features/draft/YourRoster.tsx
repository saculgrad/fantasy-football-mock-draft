import { assignRosterSlots } from '../../data/draftEngine';
import type { RosterSlot } from '../../types/league';
import type { Player } from '../../types/player';

interface YourRosterProps {
  rosterSlots: RosterSlot[];
  draftedPlayers: Player[];
}

export function YourRoster({ rosterSlots, draftedPlayers }: YourRosterProps) {
  const assignments = assignRosterSlots(rosterSlots, draftedPlayers);

  return (
    <div className="your-roster">
      <h3>Your roster</h3>
      <ul className="your-roster-list">
        {assignments.map(({ slot, player }) => (
          <li key={slot.id} className="your-roster-row">
            <span className="your-roster-slot">{slot.label}</span>
            <span className="your-roster-player">
              {player ? `${player.name} (${player.position}${player.team ? `, ${player.team}` : ''})` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
