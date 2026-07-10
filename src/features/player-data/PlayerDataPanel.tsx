import { useEffect, useRef, useState } from 'react';
import type { PlayerDataSnapshot } from '../../types/player';
import { buildPlayerDataSnapshot } from '../../data/playerData';
import { saveToStorage } from '../../storage/localStorage';
import { PLAYER_DATA_STORAGE_KEY } from '../../data/playerDataStorage';

interface PlayerDataPanelProps {
  snapshot: PlayerDataSnapshot | null;
  onSnapshotChange: (snapshot: PlayerDataSnapshot) => void;
}

export function PlayerDataPanel({ snapshot, onSnapshotChange }: PlayerDataPanelProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function update() {
    setStatus('loading');
    setError(null);
    try {
      const next = await buildPlayerDataSnapshot();
      saveToStorage(PLAYER_DATA_STORAGE_KEY, next);
      onSnapshotChange(next);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // First-time bootstrap: nothing in storage yet means this is a genuinely
  // fresh load, so fetch automatically instead of making a brand-new user
  // find and click the button. Runs once; a ref (not state) guards it so it
  // can't re-trigger later just because snapshot briefly becomes null again.
  const didAutoFetch = useRef(false);
  useEffect(() => {
    // Intentionally empty deps - this must run exactly once on mount, not
    // whenever `snapshot`/`update` happen to change (which includes right
    // after this very fetch completes).
    if (!snapshot && !didAutoFetch.current) {
      didAutoFetch.current = true;
      void update();
    }
  }, []);

  const matched = snapshot?.rankings.filter((r) => r.sleeperId !== null).length ?? 0;
  const unmatched = snapshot ? snapshot.rankings.length - matched : 0;

  return (
    <section className="player-data-panel">
      <h2>Player data</h2>
      <p className="hint">
        Player pool from Sleeper and consensus rankings from FantasyPros (via dynastyprocess/data), joined by
        player ID. Fetches automatically the first time you open the app; after that, only updates when you ask.
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
