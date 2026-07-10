import { useState } from 'react';
import type { PlayerDataSnapshot } from '../../types/player';
import { buildPlayerDataSnapshot } from '../../data/playerData';
import { loadFromStorage, saveToStorage } from '../../storage/localStorage';

const STORAGE_KEY = 'ffMockDraft:playerData';

export function PlayerDataPanel() {
  const [snapshot, setSnapshot] = useState<PlayerDataSnapshot | null>(() =>
    loadFromStorage<PlayerDataSnapshot>(STORAGE_KEY),
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function update() {
    setStatus('loading');
    setError(null);
    try {
      const next = await buildPlayerDataSnapshot();
      saveToStorage(STORAGE_KEY, next);
      setSnapshot(next);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const matched = snapshot?.rankings.filter((r) => r.sleeperId !== null).length ?? 0;
  const unmatched = snapshot ? snapshot.rankings.length - matched : 0;

  return (
    <section className="player-data-panel">
      <h2>Player data</h2>
      <p className="hint">
        Player pool from Sleeper and consensus rankings from FantasyPros (via dynastyprocess/data), joined by
        player ID. Updates only when you ask - nothing refreshes automatically.
      </p>

      {snapshot ? (
        <ul className="player-data-stats">
          <li>
            <strong>{snapshot.players.length}</strong> players
          </li>
          <li>
            <strong>{snapshot.rankings.length}</strong> ranked ({matched} matched, {unmatched} unmatched)
          </li>
          <li>Last updated: {new Date(snapshot.fetchedAt).toLocaleString()}</li>
        </ul>
      ) : (
        <p className="hint">Never fetched.</p>
      )}

      <button type="button" onClick={update} disabled={status === 'loading'}>
        {status === 'loading' ? 'Updating…' : 'Update player data'}
      </button>

      {status === 'error' && <p className="error-note">Failed to update: {error}</p>}
    </section>
  );
}
