import { useEffect, useMemo, useState } from 'react';
import type { LeagueConfig, Position } from '../../types/league';
import type { Player, PlayerDataSnapshot } from '../../types/player';
import type { PersonalRankings } from '../../types/personalRankings';
import type { DraftState } from '../../types/draft';
import {
  applyPick,
  assignRosterSlots,
  createDraftState,
  currentTeamIndex,
  isYourTurn,
  pickForBot,
  undoLastPick,
} from '../../data/draftEngine';
import { loadFromStorage, removeFromStorage, saveToStorage } from '../../storage/localStorage';
import { DRAFT_STATE_STORAGE_KEY } from '../../data/draftStateStorage';
import { AvailablePlayers } from './AvailablePlayers';
import { YourQueue } from './YourQueue';
import { YourRoster } from './YourRoster';
import { PickLog } from './PickLog';

const BOT_PICK_DELAY_MS = 500;

interface DraftBoardProps {
  leagueConfig: LeagueConfig | null;
  playerData: PlayerDataSnapshot | null;
  personalRankings: PersonalRankings | null;
}

export function DraftBoard({ leagueConfig, playerData, personalRankings }: DraftBoardProps) {
  const [draftState, setDraftState] = useState<DraftState | null>(() =>
    loadFromStorage<DraftState>(DRAFT_STATE_STORAGE_KEY),
  );
  const [selectedSlot, setSelectedSlot] = useState(1);

  useEffect(() => {
    if (draftState) saveToStorage(DRAFT_STATE_STORAGE_KEY, draftState);
  }, [draftState]);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    playerData?.players.forEach((p) => map.set(p.sleeperId, p));
    return map;
  }, [playerData]);

  const yourDraftedPlayers = useMemo(() => {
    if (!draftState) return [];
    return draftState.picks
      .filter((p) => p.teamIndex === draftState.yourTeamIndex)
      .map((p) => playersById.get(p.sleeperId))
      .filter((p): p is Player => !!p);
  }, [draftState, playersById]);

  // Positions you can currently draft into - mirrors the same eligibility rule
  // pickForBot already applies to bots, so a human can't draft a position with
  // nowhere to put it (it would otherwise silently vanish from Your Roster).
  const yourOpenPositions = useMemo(() => {
    if (!leagueConfig) return new Set<Position>();
    const openSlots = assignRosterSlots(leagueConfig.rosterSlots, yourDraftedPlayers).filter((a) => !a.player);
    return new Set(openSlots.flatMap((a) => a.slot.eligiblePositions));
  }, [leagueConfig, yourDraftedPlayers]);

  // Auto-advance bot picks one at a time so the board visibly fills in.
  useEffect(() => {
    if (!draftState || !leagueConfig || !playerData) return;
    if (draftState.status !== 'in_progress' || isYourTurn(draftState)) return;

    const teamIndex = currentTeamIndex(draftState);
    const timeoutId = window.setTimeout(() => {
      setDraftState((prev) => {
        if (!prev || prev.status !== 'in_progress' || currentTeamIndex(prev) !== teamIndex) return prev;
        const sleeperId = pickForBot({
          teamIndex,
          state: prev,
          rosterSlots: leagueConfig.rosterSlots,
          players: playerData.players,
          rankings: playerData.rankings,
        });
        return sleeperId ? applyPick(prev, teamIndex, sleeperId) : prev;
      });
    }, BOT_PICK_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draftState, leagueConfig, playerData]);

  function startDraft() {
    if (!leagueConfig) return;
    const yourTeamIndex =
      leagueConfig.draftOrder === 'random' ? Math.floor(Math.random() * leagueConfig.teamCount) : selectedSlot - 1;
    setDraftState(createDraftState(leagueConfig.teamCount, leagueConfig.rosterSlots.length, yourTeamIndex));
  }

  function draftPlayer(sleeperId: string) {
    if (!draftState || !isYourTurn(draftState)) return;
    const player = playersById.get(sleeperId);
    if (!player || !yourOpenPositions.has(player.position)) return;
    setDraftState(applyPick(draftState, draftState.yourTeamIndex, sleeperId));
  }

  function undo() {
    if (!draftState) return;
    setDraftState(undoLastPick(draftState));
  }

  function resetDraft() {
    removeFromStorage(DRAFT_STATE_STORAGE_KEY);
    setDraftState(null);
  }

  const missing: string[] = [];
  if (!leagueConfig) missing.push('save a league setup');
  if (!playerData) missing.push('fetch player data');
  if (!personalRankings || personalRankings.tiers.length === 0) missing.push('seed or import personal rankings');

  if (!draftState) {
    return (
      <section className="draft-board">
        <h2>Draft</h2>
        {!leagueConfig || missing.length > 0 ? (
          <p className="hint">Before starting a draft: {missing.join(', ')}.</p>
        ) : (
          <div className="draft-start-panel">
            {leagueConfig.draftOrder === 'manual' && (
              <label className="field">
                <span>Your draft slot</span>
                <select value={selectedSlot} onChange={(e) => setSelectedSlot(Number(e.target.value))}>
                  {Array.from({ length: leagueConfig.teamCount }, (_, i) => i + 1).map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {leagueConfig.draftOrder === 'random' && (
              <p className="hint">Your draft slot will be randomly assigned.</p>
            )}
            <button type="button" onClick={startDraft}>
              Start draft
            </button>
          </div>
        )}
      </section>
    );
  }

  const draftedIds = new Set(draftState.picks.map((p) => p.sleeperId));
  const canDraft = isYourTurn(draftState);

  if (draftState.status === 'complete') {
    return (
      <section className="draft-board">
        <h2>Draft</h2>
        <p className="hint">Draft complete.</p>
        {leagueConfig && <YourRoster rosterSlots={leagueConfig.rosterSlots} draftedPlayers={yourDraftedPlayers} />}
        <button type="button" onClick={resetDraft}>
          Start new draft
        </button>
      </section>
    );
  }

  return (
    <section className="draft-board">
      <h2>Draft</h2>
      <p className="hint">
        Pick {draftState.picks.length + 1} — {canDraft ? 'your turn' : `Team ${currentTeamIndex(draftState) + 1} is picking`}
      </p>
      <div className="draft-actions">
        <button type="button" onClick={undo} disabled={draftState.picks.length === 0}>
          Undo last pick
        </button>
        <button type="button" onClick={resetDraft}>
          Abandon draft
        </button>
      </div>

      <div className="draft-layout">
        {leagueConfig && <YourRoster rosterSlots={leagueConfig.rosterSlots} draftedPlayers={yourDraftedPlayers} />}
        <YourQueue
          personalRankings={personalRankings}
          playersById={playersById}
          draftedIds={draftedIds}
          canDraft={canDraft}
          openPositions={yourOpenPositions}
          onDraft={draftPlayer}
        />
        {playerData && (
          <AvailablePlayers
            rankings={playerData.rankings}
            playersById={playersById}
            draftedIds={draftedIds}
            canDraft={canDraft}
            openPositions={yourOpenPositions}
            onDraft={draftPlayer}
          />
        )}
        <PickLog
          picks={draftState.picks}
          teamCount={draftState.teamCount}
          yourTeamIndex={draftState.yourTeamIndex}
          playersById={playersById}
        />
      </div>
    </section>
  );
}
