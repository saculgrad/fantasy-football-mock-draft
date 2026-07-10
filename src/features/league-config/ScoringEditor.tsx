import type { ScoringSettings, StatKey } from '../../types/league';

interface ScoringEditorProps {
  scoring: ScoringSettings;
  onChange: (scoring: ScoringSettings) => void;
}

const STAT_LABELS: Array<{ key: StatKey; label: string }> = [
  { key: 'passYds', label: 'Passing yards (pts/yd)' },
  { key: 'passTd', label: 'Passing TD' },
  { key: 'passInt', label: 'Interception thrown' },
  { key: 'rushYds', label: 'Rushing yards (pts/yd)' },
  { key: 'rushTd', label: 'Rushing TD' },
  { key: 'rec', label: 'Reception' },
  { key: 'recYds', label: 'Receiving yards (pts/yd)' },
  { key: 'recTd', label: 'Receiving TD' },
  { key: 'fumbleLost', label: 'Fumble lost' },
];

export function ScoringEditor({ scoring, onChange }: ScoringEditorProps) {
  function setStat(key: StatKey, value: number) {
    onChange({ ...scoring, [key]: value });
  }

  return (
    <div className="scoring-editor">
      {STAT_LABELS.map(({ key, label }) => (
        <label key={key} className="scoring-row">
          <span>{label}</span>
          <input
            type="number"
            step="0.01"
            value={scoring[key] ?? 0}
            onChange={(e) => setStat(key, Number(e.target.value))}
          />
        </label>
      ))}
    </div>
  );
}
