import { ALL_POSITIONS, type RosterSlot } from '../../types/league';

interface RosterSlotEditorProps {
  slots: RosterSlot[];
  onChange: (slots: RosterSlot[]) => void;
}

function makeSlotId(): string {
  return `slot-${Math.random().toString(36).slice(2, 9)}`;
}

export function RosterSlotEditor({ slots, onChange }: RosterSlotEditorProps) {
  function updateSlot(id: string, patch: Partial<RosterSlot>) {
    onChange(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function togglePosition(id: string, position: RosterSlot['eligiblePositions'][number]) {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    const has = slot.eligiblePositions.includes(position);
    const eligiblePositions = has
      ? slot.eligiblePositions.filter((p) => p !== position)
      : [...slot.eligiblePositions, position];
    updateSlot(id, { eligiblePositions });
  }

  function removeSlot(id: string) {
    onChange(slots.filter((s) => s.id !== id));
  }

  function addSlot() {
    onChange([...slots, { id: makeSlotId(), label: 'NEW', eligiblePositions: [], isBench: false }]);
  }

  return (
    <div className="roster-editor">
      <table className="roster-table">
        <thead>
          <tr>
            <th>Label</th>
            {ALL_POSITIONS.map((p) => (
              <th key={p}>{p}</th>
            ))}
            <th>Bench</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.id}>
              <td>
                <input
                  type="text"
                  value={s.label}
                  onChange={(e) => updateSlot(s.id, { label: e.target.value })}
                />
              </td>
              {ALL_POSITIONS.map((p) => (
                <td key={p}>
                  <input
                    type="checkbox"
                    checked={s.eligiblePositions.includes(p)}
                    onChange={() => togglePosition(s.id, p)}
                  />
                </td>
              ))}
              <td>
                <input
                  type="checkbox"
                  checked={!!s.isBench}
                  onChange={(e) => updateSlot(s.id, { isBench: e.target.checked })}
                />
              </td>
              <td>
                <button type="button" onClick={() => removeSlot(s.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addSlot}>
        + Add slot
      </button>
    </div>
  );
}
