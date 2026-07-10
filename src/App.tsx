import { useState } from 'react';
import { LeagueConfigForm } from './features/league-config/LeagueConfigForm';
import { PlayerDataPanel } from './features/player-data/PlayerDataPanel';
import { PersonalRankingsBoard } from './features/personal-rankings/PersonalRankingsBoard';
import type { PlayerDataSnapshot } from './types/player';
import { loadFromStorage } from './storage/localStorage';
import { PLAYER_DATA_STORAGE_KEY } from './data/playerDataStorage';
import './App.css';

function App() {
  const [playerData, setPlayerData] = useState<PlayerDataSnapshot | null>(() =>
    loadFromStorage<PlayerDataSnapshot>(PLAYER_DATA_STORAGE_KEY),
  );

  return (
    <main className="app-shell">
      <header>
        <h1>Mock Draft — League Setup</h1>
      </header>
      <PlayerDataPanel snapshot={playerData} onSnapshotChange={setPlayerData} />
      <PersonalRankingsBoard playerData={playerData} />
      <LeagueConfigForm />
    </main>
  );
}

export default App;
