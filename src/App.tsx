import { LeagueConfigForm } from './features/league-config/LeagueConfigForm';
import { PlayerDataPanel } from './features/player-data/PlayerDataPanel';
import './App.css';

function App() {
  return (
    <main className="app-shell">
      <header>
        <h1>Mock Draft — League Setup</h1>
      </header>
      <PlayerDataPanel />
      <LeagueConfigForm />
    </main>
  );
}

export default App;
