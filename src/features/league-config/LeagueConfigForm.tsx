import { useEffect, useState } from 'react';
import type { LeagueConfig } from '../../types/league';
import {
  createPresetLeagueConfig,
  SCORING_PRESET_LABELS,
  type ScoringPresetKey,
} from '../../data/presets';
import { loadFromStorage, saveToStorage } from '../../storage/localStorage';
import { RosterSlotEditor } from './RosterSlotEditor';
import { ScoringEditor } from './ScoringEditor';

const STORAGE_KEY = 'ffMockDraft:leagueConfig';
const PRESET_KEYS: ScoringPresetKey[] = ['standard', 'half-ppr', 'full-ppr'];

export function LeagueConfigForm() {
  const [config, setConfig] = useState<LeagueConfig>(
    () => loadFromStorage<LeagueConfig>(STORAGE_KEY) ?? createPresetLeagueConfig('standard', 10),
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setSavedAt(null);
  }, [config]);

  function applyPreset(preset: ScoringPresetKey) {
    setConfig(createPresetLeagueConfig(preset, config.teamCount));
  }

  function save() {
    saveToStorage(STORAGE_KEY, config);
    setSavedAt(Date.now());
  }

  return (
    <div className="league-config-form">
      <section>
        <h2>League setup</h2>
        <label className="field">
          <span>League name</span>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Team count</span>
          <input
            type="number"
            min={2}
            max={32}
            value={config.teamCount}
            onChange={(e) => setConfig({ ...config, teamCount: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Draft order</span>
          <select
            value={config.draftOrder}
            onChange={(e) => setConfig({ ...config, draftOrder: e.target.value as LeagueConfig['draftOrder'] })}
          >
            <option value="random">Random</option>
            <option value="manual">Manual</option>
          </select>
        </label>
      </section>

      <section>
        <h2>Presets</h2>
        <p className="hint">Seeds roster + scoring from a standard shape. Everything below stays fully editable.</p>
        <div className="preset-buttons">
          {PRESET_KEYS.map((key) => (
            <button key={key} type="button" onClick={() => applyPreset(key)}>
              {SCORING_PRESET_LABELS[key]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Roster slots</h2>
        <RosterSlotEditor
          slots={config.rosterSlots}
          onChange={(rosterSlots) => setConfig({ ...config, rosterSlots })}
        />
      </section>

      <section>
        <h2>Scoring</h2>
        <ScoringEditor scoring={config.scoring} onChange={(scoring) => setConfig({ ...config, scoring })} />
      </section>

      <div className="save-row">
        <button type="button" onClick={save}>
          Save league
        </button>
        {savedAt && <span className="saved-note">Saved</span>}
      </div>
    </div>
  );
}
