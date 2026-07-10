import { useState } from 'react';
import type { DraftState } from '../../types/draft';
import type { RosterSlot } from '../../types/league';
import type { PlayerDataSnapshot } from '../../types/player';
import { computeTeamGrade } from '../../data/draftGrading';

interface DraftGradeCardProps {
  draftState: DraftState;
  rosterSlots: RosterSlot[];
  playerData: PlayerDataSnapshot;
}

export function DraftGradeCard({ draftState, rosterSlots, playerData }: DraftGradeCardProps) {
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(draftState.yourTeamIndex);

  const grade = computeTeamGrade(selectedTeamIndex, draftState, rosterSlots, playerData);
  const isYou = selectedTeamIndex === draftState.yourTeamIndex;

  return (
    <div className="draft-grade-card">
      <div className="section-header-row">
        <h3>Draft grade</h3>
        <label className="field team-roster-select">
          <span>Grading</span>
          <select value={selectedTeamIndex} onChange={(e) => setSelectedTeamIndex(Number(e.target.value))}>
            {Array.from({ length: draftState.teamCount }, (_, i) => i).map((teamIndex) => (
              <option key={teamIndex} value={teamIndex}>
                {teamIndex === draftState.yourTeamIndex ? 'You' : `Team ${teamIndex + 1}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="draft-grade-letter">{grade.letterGrade}</div>
      <p className="hint">
        {isYou ? 'Your' : `Team ${selectedTeamIndex + 1}'s`} overall roster ranks in the {grade.overallPercentile}
        th percentile of the league.
      </p>

      <table className="draft-grade-table">
        <thead>
          <tr>
            <th>Position</th>
            <th>Rank</th>
            <th>Percentile</th>
          </tr>
        </thead>
        <tbody>
          {grade.positionGrades.map((pg) => (
            <tr key={pg.position}>
              <td>{pg.position}</td>
              <td>
                {pg.rank} of {pg.teamCount}
              </td>
              <td>{pg.percentile}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {grade.byeWeekNote && <p className="hint grade-note">Bye weeks: {grade.byeWeekNote}</p>}
      {grade.injuryRiskNote && <p className="hint grade-note">Injury risk: {grade.injuryRiskNote}</p>}
    </div>
  );
}
