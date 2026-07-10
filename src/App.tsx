import { useState } from 'react';
import { LeagueConfigForm } from './features/league-config/LeagueConfigForm';
import { PlayerDataPanel } from './features/player-data/PlayerDataPanel';
import { PersonalRankingsBoard } from './features/personal-rankings/PersonalRankingsBoard';
import { DraftBoard } from './features/draft/DraftBoard';
import type { PlayerDataSnapshot } from './types/player';
import type { LeagueConfig } from './types/league';
import type { PersonalRankings } from './types/personalRankings';
import { loadFromStorage } from './storage/localStorage';
import { PLAYER_DATA_STORAGE_KEY } from './data/playerDataStorage';
import { LEAGUE_CONFIG_STORAGE_KEY } from './data/leagueConfigStorage';
import { PERSONAL_RANKINGS_STORAGE_KEY } from './data/personalRankingsStorage';
import { DRAFT_STATE_STORAGE_KEY } from './data/draftStateStorage';
import type { DraftState } from './types/draft';
import './App.css';

function App() {
  const [playerData, setPlayerData] = useState<PlayerDataSnapshot | null>(() =>
    loadFromStorage<PlayerDataSnapshot>(PLAYER_DATA_STORAGE_KEY),
  );
  const [leagueConfig, setLeagueConfig] = useState<LeagueConfig | null>(() =>
    loadFromStorage<LeagueConfig>(LEAGUE_CONFIG_STORAGE_KEY),
  );
  const [personalRankings, setPersonalRankings] = useState<PersonalRankings | null>(() =>
    loadFromStorage<PersonalRankings>(PERSONAL_RANKINGS_STORAGE_KEY),
  );
  // Starts collapsed if a draft is already in progress (e.g. reloaded mid-draft),
  // and auto-collapses the moment a new draft starts (DraftBoard's onDraftStart).
  const [personalRankingsCollapsed, setPersonalRankingsCollapsed] = useState(
    () => loadFromStorage<DraftState>(DRAFT_STATE_STORAGE_KEY)?.status === 'in_progress',
  );

  return (
    <main className="app-shell">
      <header>
        <h1>Mock Draft — League Setup</h1>
      </header>
      <PlayerDataPanel snapshot={playerData} onSnapshotChange={setPlayerData} />
      <PersonalRankingsBoard
        playerData={playerData}
        onRankingsChange={setPersonalRankings}
        collapsed={personalRankingsCollapsed}
        onToggleCollapsed={() => setPersonalRankingsCollapsed((c) => !c)}
      />
      <LeagueConfigForm onSave={setLeagueConfig} />
      <DraftBoard
        leagueConfig={leagueConfig}
        playerData={playerData}
        personalRankings={personalRankings}
        onDraftStart={() => setPersonalRankingsCollapsed(true)}
      />
    </main>
  );
}

export default App;
