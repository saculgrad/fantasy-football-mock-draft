import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { PersonalRankings, RankingTier } from '../../types/personalRankings';
import type { Player, PlayerDataSnapshot } from '../../types/player';
import { loadFromStorage, saveToStorage } from '../../storage/localStorage';
import { PERSONAL_RANKINGS_STORAGE_KEY } from '../../data/personalRankingsStorage';
import { seedFromPublicRankings } from '../../data/seedRankings';
import { parseRankingCsv } from '../../data/csvImport';
import { TierColumn } from './TierColumn';
import { PlayerRow } from './PlayerRow';

function findTierIndexForPlayer(tiers: RankingTier[], playerId: string): number {
  return tiers.findIndex((t) => t.playerIds.includes(playerId));
}

function findTierIndexById(tiers: RankingTier[], id: string): number {
  return tiers.findIndex((t) => t.id === id);
}

interface PersonalRankingsBoardProps {
  playerData: PlayerDataSnapshot | null;
  onRankingsChange?: (rankings: PersonalRankings) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function PersonalRankingsBoard({
  playerData,
  onRankingsChange,
  collapsed,
  onToggleCollapsed,
}: PersonalRankingsBoardProps) {
  const [rankings, setRankings] = useState<PersonalRankings | null>(() =>
    loadFromStorage<PersonalRankings>(PERSONAL_RANKINGS_STORAGE_KEY),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    playerData?.players.forEach((p) => map.set(p.sleeperId, p));
    return map;
  }, [playerData]);

  useEffect(() => {
    if (rankings) {
      saveToStorage(PERSONAL_RANKINGS_STORAGE_KEY, rankings);
      onRankingsChange?.(rankings);
    }
  }, [rankings, onRankingsChange]);

  function seed() {
    if (!playerData) return;
    setRankings(seedFromPublicRankings(playerData));
  }

  function addTier() {
    setRankings((prev) => {
      const base = prev ?? { tiers: [], updatedAt: new Date().toISOString() };
      const nextNumber = base.tiers.length + 1;
      return {
        ...base,
        tiers: [...base.tiers, { id: `tier-${Date.now()}`, name: `Tier ${nextNumber}`, playerIds: [] }],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function renameTier(tierId: string, name: string) {
    setRankings((prev) =>
      prev
        ? { ...prev, tiers: prev.tiers.map((t) => (t.id === tierId ? { ...t, name } : t)), updatedAt: new Date().toISOString() }
        : prev,
    );
  }

  function deleteTier(tierId: string) {
    const tier = rankings?.tiers.find((t) => t.id === tierId);
    if (tier && tier.playerIds.length > 0) {
      const count = tier.playerIds.length;
      const confirmed = window.confirm(
        `Delete "${tier.name}" and its ${count} player${count === 1 ? '' : 's'}? This can't be undone.`,
      );
      if (!confirmed) return;
    }
    setRankings((prev) =>
      prev ? { ...prev, tiers: prev.tiers.filter((t) => t.id !== tierId), updatedAt: new Date().toISOString() } : prev,
    );
  }

  function removePlayer(tierId: string, playerId: string) {
    setRankings((prev) =>
      prev
        ? {
            ...prev,
            tiers: prev.tiers.map((t) =>
              t.id === tierId ? { ...t, playerIds: t.playerIds.filter((id) => id !== playerId) } : t,
            ),
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
  }

  function movePlayerWithinTier(tierId: string, playerId: string, direction: 'up' | 'down') {
    setRankings((prev) => {
      if (!prev) return prev;
      const tiers = prev.tiers.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
      const tier = tiers.find((t) => t.id === tierId);
      if (!tier) return prev;
      const index = tier.playerIds.indexOf(playerId);
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= tier.playerIds.length) return prev;
      [tier.playerIds[index], tier.playerIds[swapWith]] = [tier.playerIds[swapWith], tier.playerIds[index]];
      return { ...prev, tiers, updatedAt: new Date().toISOString() };
    });
  }

  function movePlayerToTier(sourceTierId: string, playerId: string, targetTierId: string) {
    if (sourceTierId === targetTierId) return;
    setRankings((prev) => {
      if (!prev) return prev;
      const tiers = prev.tiers.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
      const source = tiers.find((t) => t.id === sourceTierId);
      const target = tiers.find((t) => t.id === targetTierId);
      if (!source || !target) return prev;
      source.playerIds = source.playerIds.filter((id) => id !== playerId);
      target.playerIds.push(playerId);
      return { ...prev, tiers, updatedAt: new Date().toISOString() };
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    setRankings((prev) => {
      if (!prev) return prev;
      const tiers = prev.tiers.map((t) => ({ ...t, playerIds: [...t.playerIds] }));

      const activeId = String(active.id);
      const overId = String(over.id);

      const sourceTierIndex = findTierIndexForPlayer(tiers, activeId);
      if (sourceTierIndex === -1) return prev;

      // `over` is either another player row (id === playerId) or an empty
      // tier's droppable container (id === tier.id).
      let destTierIndex = findTierIndexForPlayer(tiers, overId);
      let destIndex: number;
      if (destTierIndex === -1) {
        destTierIndex = findTierIndexById(tiers, overId);
        if (destTierIndex === -1) return prev;
        destIndex = tiers[destTierIndex].playerIds.length;
      } else {
        destIndex = tiers[destTierIndex].playerIds.indexOf(overId);
      }

      if (sourceTierIndex === destTierIndex) {
        const sourceIndex = tiers[sourceTierIndex].playerIds.indexOf(activeId);
        tiers[sourceTierIndex].playerIds = arrayMove(tiers[sourceTierIndex].playerIds, sourceIndex, destIndex);
      } else {
        tiers[sourceTierIndex].playerIds = tiers[sourceTierIndex].playerIds.filter((id) => id !== activeId);
        tiers[destTierIndex].playerIds.splice(destIndex, 0, activeId);
      }

      return { ...prev, tiers, updatedAt: new Date().toISOString() };
    });
  }

  async function handleCsvFile(file: File) {
    if (!playerData) return;
    const text = await file.text();
    const result = parseRankingCsv(text, playerData.players);
    setRankings({ tiers: result.tiers, updatedAt: new Date().toISOString() });
    const unmatchedPreview = result.unmatchedNames.slice(0, 5).join(', ');
    setImportSummary(
      `Imported ${result.matchedCount} players` +
        (result.unmatchedNames.length > 0
          ? `, ${result.unmatchedNames.length} unmatched (${unmatchedPreview}${result.unmatchedNames.length > 5 ? '…' : ''})`
          : ''),
    );
  }

  const activePlayer = activeId ? playersById.get(activeId) : undefined;
  const tierCount = rankings?.tiers.length ?? 0;
  const totalPlayers = rankings?.tiers.reduce((sum, t) => sum + t.playerIds.length, 0) ?? 0;

  return (
    <section className="personal-rankings-board">
      <div className="section-header-row">
        <h2>Personal rankings</h2>
        <button type="button" className="collapse-toggle" onClick={onToggleCollapsed}>
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {collapsed ? (
        <p className="hint">
          {tierCount > 0 ? `${tierCount} tier${tierCount === 1 ? '' : 's'}, ${totalPlayers} players — collapsed` : 'No rankings yet.'}
        </p>
      ) : (
        <>
          {!playerData && <p className="hint">Fetch player data above before seeding or importing rankings.</p>}

          <div className="rankings-actions">
            <button type="button" onClick={seed} disabled={!playerData}>
              Seed from public rankings
            </button>
            <button type="button" onClick={addTier}>
              + Add tier
            </button>
            <label className="csv-import-label">
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={!playerData}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCsvFile(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {importSummary && <p className="hint">{importSummary}</p>}

          {rankings && rankings.tiers.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="tier-list">
                {rankings.tiers.map((tier) => (
                  <TierColumn
                    key={tier.id}
                    tier={tier}
                    allTiers={rankings.tiers}
                    playersById={playersById}
                    onRename={(name) => renameTier(tier.id, name)}
                    onDelete={() => deleteTier(tier.id)}
                    onRemovePlayer={(playerId) => removePlayer(tier.id, playerId)}
                    onMovePlayer={(playerId, direction) => movePlayerWithinTier(tier.id, playerId, direction)}
                    onMovePlayerToTier={(playerId, targetTierId) => movePlayerToTier(tier.id, playerId, targetTierId)}
                  />
                ))}
              </div>
              <DragOverlay>
                {activePlayer ? (
                  <PlayerRow playerId={activePlayer.sleeperId} player={activePlayer} onRemove={() => {}} />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <p className="hint">No rankings yet — seed from public rankings or import a CSV.</p>
          )}
        </>
      )}
    </section>
  );
}
