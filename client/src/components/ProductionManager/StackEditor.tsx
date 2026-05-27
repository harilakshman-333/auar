// ──────────────────────────────────────────────
// Production Manager — Stack Editor (Drag & Drop)
// Allows manual panel reordering between stacks and unassigned pool
// with strict LIFO validation
// ──────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import type { Panel, Stack } from '../../types';

interface StackEditorProps {
  stacks: Stack[];
  panels: Panel[];
  onSave: (stacks: Stack[]) => Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
  title?: string;
  subtitle?: string;
}

function getPanelTypeColor(type: string): string {
  switch (type) {
    case 'external_wall': return 'var(--color-ext-wall)';
    case 'internal_wall': return 'var(--color-int-wall)';
    case 'floor_cassette': return 'var(--color-floor)';
    case 'roof_panel': return 'var(--color-roof)';
    default: return 'var(--color-neutral-400)';
  }
}

function getPanelTypeLabel(type: string): string {
  switch (type) {
    case 'external_wall': return 'EXT';
    case 'internal_wall': return 'INT';
    case 'floor_cassette': return 'FLR';
    case 'roof_panel': return 'ROOF';
    default: return '???';
  }
}

/** Validate LIFO: panels within a stack must be in ascending install_sequence order */
function validateLIFO(panelIds: string[], panelMap: Map<string, Panel>): boolean {
  let lastSeq = -1;
  for (const pid of panelIds) {
    const panel = panelMap.get(pid);
    if (!panel) continue;
    // Skip already installed or damaged panels since they are not physically stacked anymore
    if (panel.status === 'installed' || panel.status === 'damaged') continue;
    if (panel.install_sequence < lastSeq) return false;
    lastSeq = panel.install_sequence;
  }
  return true;
}

export default function StackEditor({
  stacks: initialStacks,
  panels,
  onSave,
  onCancel,
  saveLabel,
  title,
  subtitle,
}: StackEditorProps) {
  const panelMap = new Map(panels.map((p) => [p.id, p]));

  // Find active panels that are not currently in any stack
  const initialAssignedIds = new Set(initialStacks.flatMap((s) => s.panelIds));
  const initialUnassigned = panels.filter(
    (p) =>
      p.status !== 'installed' &&
      p.status !== 'damaged' &&
      !initialAssignedIds.has(p.id)
  );

  const [editStacks, setEditStacks] = useState<Stack[]>(
    initialStacks.map((s) => ({ ...s, panelIds: [...s.panelIds] }))
  );
  const [unassignedPanels, setUnassignedPanels] = useState<string[]>(
    initialUnassigned.map((p) => p.id)
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragItem, setDragItem] = useState<{
    panelId: string;
    fromStackId: string; // 'unassigned' or a stack ID
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // 'unassigned' or a stack ID
  const shakeRef = useRef<string | null>(null);
  const [shakeStack, setShakeStack] = useState<string | null>(null);

  const handleDragStart = (
    e: React.DragEvent,
    panelId: string,
    stackId: string
  ) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', panelId);
    setDragItem({ panelId, fromStackId: stackId });
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent, stackId: string) => {
    e.preventDefault();
    setDropTarget(stackId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, toStackId: string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!dragItem) return;
    const { panelId, fromStackId } = dragItem;
    if (fromStackId === toStackId) {
      setDragItem(null);
      return;
    }

    const newStacks = editStacks.map((s) => ({
      ...s,
      panelIds: [...s.panelIds],
    }));

    // Case 1: Drop into Unassigned Pool
    if (toStackId === 'unassigned') {
      const fromStack = newStacks.find((s) => s.id === fromStackId);
      if (!fromStack) return;

      // Remove from source stack
      fromStack.panelIds = fromStack.panelIds.filter((pid) => pid !== panelId);
      fromStack.total_weight_kg = fromStack.panelIds.reduce(
        (sum, pid) => sum + (panelMap.get(pid)?.weight_kg ?? 0),
        0
      );

      // Add to unassigned list (sorted by sequence)
      const updatedUnassigned = [...unassignedPanels, panelId].sort((a, b) => {
        const pa = panelMap.get(a);
        const pb = panelMap.get(b);
        return (pa?.install_sequence ?? 0) - (pb?.install_sequence ?? 0);
      });

      setUnassignedPanels(updatedUnassigned);
      setEditStacks(newStacks.filter((s) => s.panelIds.length > 0));
      setDragItem(null);
      setError(null);
      return;
    }

    // Case 2: Drop into Stack
    const toStack = newStacks.find((s) => s.id === toStackId);
    if (!toStack) return;

    // Temporarily save previous states for potential revert on error
    const prevStacks = editStacks;
    const prevUnassigned = unassignedPanels;

    // Remove from source
    if (fromStackId === 'unassigned') {
      setUnassignedPanels(unassignedPanels.filter((pid) => pid !== panelId));
    } else {
      const fromStack = newStacks.find((s) => s.id === fromStackId);
      if (fromStack) {
        fromStack.panelIds = fromStack.panelIds.filter((pid) => pid !== panelId);
        fromStack.total_weight_kg = fromStack.panelIds.reduce(
          (sum, pid) => sum + (panelMap.get(pid)?.weight_kg ?? 0),
          0
        );
      }
    }

    // Insert into target stack at sequence order
    const panel = panelMap.get(panelId);
    if (!panel) return;

    let insertIdx = toStack.panelIds.length;
    for (let i = 0; i < toStack.panelIds.length; i++) {
      const existingPanel = panelMap.get(toStack.panelIds[i]);
      if (
        existingPanel &&
        existingPanel.install_sequence > panel.install_sequence
      ) {
        insertIdx = i;
        break;
      }
    }
    toStack.panelIds.splice(insertIdx, 0, panelId);

    // Validate LIFO
    if (!validateLIFO(toStack.panelIds, panelMap)) {
      setError(
        `LIFO violation: Panel ${panelId} (sequence #${panel.install_sequence}) breaks the order in ${toStackId}.`
      );
      setShakeStack(toStackId);
      shakeRef.current = toStackId;
      setTimeout(() => {
        if (shakeRef.current === toStackId) setShakeStack(null);
      }, 600);

      // Revert states
      setEditStacks(prevStacks);
      setUnassignedPanels(prevUnassigned);
      setDragItem(null);
      return;
    }

    // Update target weight
    toStack.total_weight_kg = toStack.panelIds.reduce(
      (sum, pid) => sum + (panelMap.get(pid)?.weight_kg ?? 0),
      0
    );

    setEditStacks(newStacks.filter((s) => s.panelIds.length > 0));
    setDragItem(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(editStacks);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const weightWarnings = editStacks.filter((s) => s.total_weight_kg > 500);

  return (
    <div className="stack-editor" id="stack-editor-view">
      <div className="stack-editor__toolbar">
        <h3>{title ?? '✏️ Manual Edit Mode'}</h3>
        <div className="stack-editor__toolbar-buttons">
          <button
            className="stack-editor__cancel-btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="stack-editor__save-btn"
            onClick={handleSave}
            disabled={saving}
            id="save-manual-stacks-btn"
          >
            {saving ? 'Saving…' : (saveLabel ?? '✓ Save Changes')}
          </button>
        </div>
      </div>

      {error && <div className="stack-editor__error">{error}</div>}

      {weightWarnings.length > 0 && (
        <div className="stack-editor__weight-warn">
          ⚠️ {weightWarnings.map((s) => s.id).join(', ')} exceed{weightWarnings.length === 1 ? 's' : ''} the 500kg limit
        </div>
      )}

      <p className="stack-editor__hint">
        {subtitle ?? 'Drag panels between stacks or back to the Unassigned Pool on the left. The system will auto-insert in sequence order and reject invalid LIFO moves.'}
      </p>

      <div className="stack-editor__layout">
        {/* Left Column: Unassigned Pool */}
        <div
          className={`stack-editor__unassigned-column ${
            dropTarget === 'unassigned'
              ? 'stack-editor__unassigned-column--drop-active'
              : ''
          }`}
          onDragOver={(e) => handleDragOver(e, 'unassigned')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'unassigned')}
        >
          <div className="stack-editor__unassigned-header">
            <div className="stack-editor__unassigned-title">
              <span>Unassigned Panels</span>
              <span className="stack-editor__unassigned-count">
                {unassignedPanels.length}
              </span>
            </div>
          </div>
          <div className="stack-editor__unassigned-list">
            {unassignedPanels.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' }}>
                All panels assigned. Drag here to unassign.
              </div>
            ) : (
              unassignedPanels.map((pid) => {
                const panel = panelMap.get(pid);
                const isReplacement = panel?.is_replacement;
                return (
                  <div
                    key={pid}
                    className="stack-editor__panel"
                    draggable
                    onDragStart={(e) => handleDragStart(e, pid, 'unassigned')}
                  >
                    <span className="stack-editor__drag-handle">⠿</span>
                    <span
                      className="manifest__panel-type-badge"
                      style={{
                        backgroundColor: panel
                          ? getPanelTypeColor(panel.type)
                          : undefined,
                      }}
                    >
                      {panel ? getPanelTypeLabel(panel.type) : '?'}
                    </span>
                    <span className="stack-editor__panel-id">
                      {pid}
                      {isReplacement && (
                        <span className="inventory__replacement-tag">REPL</span>
                      )}
                    </span>
                    <span className="stack-editor__panel-weight">
                      {panel?.weight_kg ?? '?'}kg
                    </span>
                    <span className="stack-editor__panel-seq">
                      seq #{panel?.install_sequence ?? '?'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Stacks Grid */}
        <div className="stack-editor__stacks-column">
          {editStacks.map((stack) => (
            <div
              key={stack.id}
              className={`stack-editor__stack ${
                dropTarget === stack.id ? 'stack-editor__stack--drop-active' : ''
              } ${shakeStack === stack.id ? 'stack-editor__stack--shake' : ''}`}
              onDragOver={(e) => handleDragOver(e, stack.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stack.id)}
            >
              <div className="stack-editor__stack-header">
                <span className="stack-editor__stack-id">{stack.id}</span>
                <span className="stack-editor__stack-zone">
                  📍 {stack.target_zone} &middot; Day {stack.delivery_day}
                </span>
                <span
                  className={`stack-editor__stack-weight ${
                    stack.total_weight_kg > 500
                      ? 'stack-editor__stack-weight--over'
                      : ''
                  }`}
                >
                  {stack.total_weight_kg}kg / 500kg
                </span>
              </div>
              <div className="stack-editor__panels">
                {stack.panelIds.map((pid, idx) => {
                  const panel = panelMap.get(pid);
                  const isReplacement = panel?.is_replacement;
                  return (
                    <div
                      key={pid}
                      className={`stack-editor__panel ${
                        idx === 0 ? 'stack-editor__panel--top' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pid, stack.id)}
                    >
                      <span className="stack-editor__drag-handle">⠿</span>
                      <span className="stack-editor__panel-order">
                        {idx === 0 ? '▲ TOP' : idx + 1}
                      </span>
                      <span
                        className="manifest__panel-type-badge"
                        style={{
                          backgroundColor: panel
                            ? getPanelTypeColor(panel.type)
                            : undefined,
                        }}
                      >
                        {panel ? getPanelTypeLabel(panel.type) : '?'}
                      </span>
                      <span className="stack-editor__panel-id">
                        {pid}
                        {isReplacement && (
                          <span className="inventory__replacement-tag">REPL</span>
                        )}
                      </span>
                      <span className="stack-editor__panel-weight">
                        {panel?.weight_kg ?? '?'}kg
                      </span>
                      <span className="stack-editor__panel-seq">
                        seq #{panel?.install_sequence ?? '?'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
