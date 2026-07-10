import { useState } from 'react';
import type { RosterSlot } from '../../types/league';
import type { DraftPick } from '../../types/draft';
import type { Player } from '../../types/player';
import { YourRoster } from './YourRoster';

interface TeamRosterPanelProps {
  rosterSlots: RosterSlot[];
  picks: DraftPick[];
  teamCount: number;
  yourTeamIndex: number;
  playersById: Map<string, Player>;
}

export function TeamRosterPanel({ rosterSlots, picks, teamCount, yourTeamIndex, playersById }: TeamRosterPanelProps) {
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(yourTeamIndex);

  const draftedPlayers = picks
    .filter((p) => p.teamIndex === selectedTeamIndex)
    .map((p) => playersById.get(p.sleeperId))
    .filter((p): p is Player => !!p);

  const isYou = selectedTeamIndex === yourTeamIndex;

  return (
    <div className="team-roster-panel">
      <label className="field team-roster-select">
        <span>Viewing roster</span>
        <select value={selectedTeamIndex} onChange={(e) => setSelectedTeamIndex(Number(e.target.value))}>
          {Array.from({ length: teamCount }, (_, i) => i).map((teamIndex) => (
            <option key={teamIndex} value={teamIndex}>
              {teamIndex === yourTeamIndex ? 'You' : `Team ${teamIndex + 1}`}
            </option>
          ))}
        </select>
      </label>
      <YourRoster
        rosterSlots={rosterSlots}
        draftedPlayers={draftedPlayers}
        title={isYou ? 'Your roster' : `Team ${selectedTeamIndex + 1}'s roster`}
      />
    </div>
  );
}
