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

  return (
    <main className="app-shell">
      <header>
        <h1>Mock Draft — League Setup</h1>
      </header>
      <PlayerDataPanel snapshot={playerData} onSnapshotChange={setPlayerData} />
      <PersonalRankingsBoard playerData={playerData} onRankingsChange={setPersonalRankings} />
      <LeagueConfigForm onSave={setLeagueConfig} />
      <DraftBoard leagueConfig={leagueConfig} playerData={playerData} personalRankings={personalRankings} />
    </main>
  );
}

export default App;
