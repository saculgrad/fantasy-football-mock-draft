import type { DraftPick } from '../../types/draft';
import type { Player } from '../../types/player';

interface PickLogProps {
  picks: DraftPick[];
  teamCount: number;
  yourTeamIndex: number;
  playersById: Map<string, Player>;
}

export function PickLog({ picks, teamCount, yourTeamIndex, playersById }: PickLogProps) {
  const ordered = [...picks].reverse();

  return (
    <div className="pick-log">
      <h3>Pick log</h3>
      {ordered.length === 0 ? (
        <p className="hint">No picks yet.</p>
      ) : (
        <ul className="pick-log-list">
          {ordered.map((pick) => {
            const player = playersById.get(pick.sleeperId);
            const pickInRound = ((pick.pickNumber - 1) % teamCount) + 1;
            const isYou = pick.teamIndex === yourTeamIndex;
            return (
              <li key={pick.pickNumber} className={isYou ? 'pick-log-row you' : 'pick-log-row'}>
                <span className="pick-log-number">
                  {pick.round}.{String(pickInRound).padStart(2, '0')}
                </span>
                <span className="pick-log-team">{isYou ? 'You' : `Team ${pick.teamIndex + 1}`}</span>
                <span className="pick-log-player">
                  {player ? `${player.name} (${player.position}${player.team ? `, ${player.team}` : ''})` : pick.sleeperId}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
