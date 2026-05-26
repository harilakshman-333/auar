// ──────────────────────────────────────────────
// In-Memory Data Store
// Initializes from seed.json, provides CRUD access
// ──────────────────────────────────────────────

import seedData from './seed.json';
import type { Panel, Stack, Delivery, RawPanel } from '../types/index.js';

// ── Panels ───────────────────────────────────
const panels: Map<string, Panel> = new Map();

(seedData.panels as RawPanel[]).forEach((raw) => {
  panels.set(raw.id, { ...raw, status: 'pending' });
});

// ── Stacks & Deliveries ──────────────────────
let stacks: Stack[] = [];
let deliveries: Map<number, Delivery> = new Map();

// ── Panel Accessors ──────────────────────────
export function getAllPanels(): Panel[] {
  return Array.from(panels.values()).sort(
    (a, b) => a.install_sequence - b.install_sequence
  );
}

export function getPanelById(id: string): Panel | undefined {
  return panels.get(id);
}

export function updatePanelStatus(
  id: string,
  status: Panel['status']
): Panel | undefined {
  const panel = panels.get(id);
  if (!panel) return undefined;
  panel.status = status;

  if (status === 'damaged') {
    // Remove the damaged panel from its stack
    for (const stack of stacks) {
      if (stack.panelIds.includes(id)) {
        stack.panelIds = stack.panelIds.filter((pid) => pid !== id);
        // Recalculate weight
        stack.total_weight_kg = stack.panelIds.reduce((sum, pid) => {
          const p = panels.get(pid);
          return sum + (p?.weight_kg ?? 0);
        }, 0);
      }
    }
    // Remove empty stacks
    stacks = stacks.filter((s) => s.panelIds.length > 0);
    // Rebuild deliveries grouping
    deliveries = new Map();
    for (const stack of stacks) {
      const existing = deliveries.get(stack.delivery_day);
      if (existing) {
        existing.stacks.push(stack);
      } else {
        deliveries.set(stack.delivery_day, {
          delivery_day: stack.delivery_day,
          stacks: [stack],
        });
      }
    }
  }

  return panel;
}

// ── Stack / Delivery Accessors ───────────────
export function getStacks(): Stack[] {
  return stacks;
}

export function setStacks(newStacks: Stack[], isManual: boolean = false): void {
  if (isManual) {
    // For manual edits, the user submits all stacks (including historical/installed ones).
    // Do not filter or combine. Treat the submitted newStacks as the entire ground-truth state.
    
    // Auto-sort stacks by sequence number ascending to ensure correct LIFO order
    for (const stack of newStacks) {
      stack.panelIds.sort((a, b) => {
        const pa = panels.get(a);
        const pb = panels.get(b);
        return (pa?.install_sequence ?? 0) - (pb?.install_sequence ?? 0);
      });
      stack.total_weight_kg = stack.panelIds.reduce((sum, pid) => {
        const p = panels.get(pid);
        return sum + (p?.weight_kg ?? 0);
      }, 0);
    }

    // Validate global chronological sequence across all days
    validateGlobalSequence(newStacks);

    // Reset status and delivery_day of all active panels (not installed/damaged)
    for (const panel of panels.values()) {
      if (panel.status === 'stacked') {
        panel.status = 'pending';
      }
      if (panel.status === 'pending' || panel.status === 'on_order') {
        panel.delivery_day = null;
      }
    }

    // Assign IDs to stacks (STACK-01, STACK-02...)
    let stackCounter = 1;
    stacks = newStacks.map((stack) => ({
      ...stack,
      id: `STACK-${String(stackCounter++).padStart(2, '0')}`,
    }));

    // Rebuild deliveries grouping
    deliveries = new Map();
    for (const stack of stacks) {
      const existing = deliveries.get(stack.delivery_day);
      if (existing) {
        existing.stacks.push(stack);
      } else {
        deliveries.set(stack.delivery_day, {
          delivery_day: stack.delivery_day,
          stacks: [stack],
        });
      }
    }

    // Mark panels in stacks as stacked/on_order and set their delivery_day
    for (const stack of stacks) {
      for (const panelId of stack.panelIds) {
        const panel = panels.get(panelId);
        if (panel) {
          if (panel.status === 'pending') {
            panel.status = 'stacked';
          }
          panel.delivery_day = stack.delivery_day;
        }
      }
    }
  } else {
    // 1. Identify historical stacks (any stack containing an installed panel)
    const historicalStacks = stacks.filter((stack) =>
      stack.panelIds.some((pid) => panels.get(pid)?.status === 'installed')
    );

    // Get the list of panel IDs that are in historical stacks
    const historicalPanelIds = new Set(
      historicalStacks.flatMap((s) => s.panelIds)
    );

    // 3. Filter the new AI stacks to ensure they don't contain any panels from historical stacks
    const filteredNewStacks = newStacks.filter((stack) =>
      stack.panelIds.every((pid) => !historicalPanelIds.has(pid))
    );

    // Auto-sort new stacks by sequence number ascending to ensure correct LIFO order
    for (const stack of filteredNewStacks) {
      stack.panelIds.sort((a, b) => {
        const pa = panels.get(a);
        const pb = panels.get(b);
        return (pa?.install_sequence ?? 0) - (pb?.install_sequence ?? 0);
      });
      stack.total_weight_kg = stack.panelIds.reduce((sum, pid) => {
        const p = panels.get(pid);
        return sum + (p?.weight_kg ?? 0);
      }, 0);
    }

    // Validate global chronological sequence across days
    validateGlobalSequence([...historicalStacks, ...filteredNewStacks]);

    // 2. Reset status and delivery_day of all active panels NOT in historical stacks
    for (const panel of panels.values()) {
      if (historicalPanelIds.has(panel.id)) {
        continue; // Keep historical panels as they are
      }
      if (panel.status === 'stacked') {
        panel.status = 'pending';
      }
      if (panel.status === 'pending' || panel.status === 'on_order') {
        panel.delivery_day = null;
      }
    }

    // 4. Combine historical stacks and new stacks, re-indexing stack IDs to avoid duplicates
    const combinedStacks: Stack[] = [...historicalStacks];
    let stackCounter = historicalStacks.length + 1;

    for (const stack of filteredNewStacks) {
      const newId = `STACK-${String(stackCounter++).padStart(2, '0')}`;
      combinedStacks.push({
        ...stack,
        id: newId,
      });
    }

    stacks = combinedStacks;

    // 5. Rebuild deliveries grouping
    deliveries = new Map();
    for (const stack of stacks) {
      const existing = deliveries.get(stack.delivery_day);
      if (existing) {
        existing.stacks.push(stack);
      } else {
        deliveries.set(stack.delivery_day, {
          delivery_day: stack.delivery_day,
          stacks: [stack],
        });
      }
    }

    // 6. Mark panels in new stacks as 'stacked' and set their delivery_day
    for (const stack of filteredNewStacks) {
      for (const panelId of stack.panelIds) {
        const panel = panels.get(panelId);
        if (panel && !historicalPanelIds.has(panelId)) {
          if (panel.status === 'pending') {
            panel.status = 'stacked';
          }
          panel.delivery_day = stack.delivery_day;
        }
      }
    }
  }
}

export function getDeliveryByDay(day: number): Delivery | undefined {
  return deliveries.get(day);
}

export function getAllDeliveries(): Delivery[] {
  return Array.from(deliveries.values()).sort(
    (a, b) => a.delivery_day - b.delivery_day
  );
}

// ── Sequence Validation ──────────────────────
/**
 * Returns the next panel that should be installed globally.
 * A panel is "next" if it has the lowest install_sequence
 * among all non-installed, non-damaged, non-on_order panels.
 */
export function getNextSequentialPanel(): Panel | undefined {
  const allPanels = getAllPanels();
  const installedSeqs = new Set(
    allPanels.filter((p) => p.status === 'installed').map((p) => p.install_sequence)
  );

  const allSeqs = allPanels.map((p) => p.install_sequence);
  const minSeq = allSeqs.length > 0 ? Math.min(...allSeqs) : 1;
  const maxSeq = allSeqs.length > 0 ? Math.max(...allSeqs) : 1;

  let nextRequiredSeq = minSeq;
  for (let seq = minSeq; seq <= maxSeq; seq++) {
    if (!installedSeqs.has(seq)) {
      nextRequiredSeq = seq;
      break;
    }
  }

  // Return the active panel (not installed/damaged) matching the next required sequence
  return allPanels.find(
    (p) => p.install_sequence === nextRequiredSeq && p.status !== 'installed' && p.status !== 'damaged'
  );
}

export function getProjectInfo() {
  return seedData.project;
}

// ── Dependency Management ────────────────────
export interface DependencyInfo {
  locked: boolean;
  reason: string;
  blockedBy: string[];  // Panel IDs that need to be installed first
}

/**
 * Returns dependency status for all panels.
 * Rule: Floor cassettes at level 1 are locked until all L1 external walls are installed.
 */
export function getDependencyStatus(): Record<string, DependencyInfo> {
  const allPanels = getAllPanels();
  const result: Record<string, DependencyInfo> = {};

  // Find all L1 external walls
  const l1ExternalWalls = allPanels.filter(
    (p) => p.type === 'external_wall' && p.level === 1
  );
  const uninstalledL1Walls = l1ExternalWalls.filter(
    (p) => p.status !== 'installed'
  );
  const allL1WallsInstalled = uninstalledL1Walls.length === 0;

  for (const panel of allPanels) {
    if (panel.type === 'floor_cassette' && panel.level === 1) {
      if (!allL1WallsInstalled) {
        result[panel.id] = {
          locked: true,
          reason: 'Waiting for all L1 external walls to be installed and inspected',
          blockedBy: uninstalledL1Walls.map((w) => w.id),
        };
      } else {
        result[panel.id] = { locked: false, reason: '', blockedBy: [] };
      }
    } else {
      result[panel.id] = { locked: false, reason: '', blockedBy: [] };
    }
  }

  return result;
}

// ── Commission Replacement ───────────────────
/**
 * Clones a damaged panel as a replacement with 'on_order' status.
 * The replacement gets a '-R1' suffix (or -R2, -R3, etc. for subsequent replacements).
 */
export function commissionReplacement(damagedPanelId: string): Panel | undefined {
  const original = panels.get(damagedPanelId);
  if (!original || original.status !== 'damaged') return undefined;

  // Find existing replacements to determine suffix number
  let suffixNum = 1;
  while (panels.has(`${damagedPanelId}-R${suffixNum}`)) {
    suffixNum++;
  }

  const replacementId = `${damagedPanelId}-R${suffixNum}`;
  const replacement: Panel = {
    id: replacementId,
    type: original.type,
    level: original.level,
    zone: original.zone,
    width_mm: original.width_mm,
    height_mm: original.height_mm,
    thickness_mm: original.thickness_mm,
    weight_kg: original.weight_kg,
    install_sequence: original.install_sequence,
    delivery_day: null,
    notes: `Replacement for damaged ${damagedPanelId}. Awaiting manufacture.`,
    status: 'on_order',
    is_replacement: true,
    replaces_panel_id: damagedPanelId,
  };

  panels.set(replacementId, replacement);
  return replacement;
}

// ── Push Blocked Panels ──────────────────────
/**
 * When a panel is damaged, all subsequent panels in the same delivery day
 * that come after it in sequence are "blocked" and must be un-assigned.
 * Returns the list of panels that were pushed.
 */
export function pushBlockedPanels(damagedPanelId: string): Panel[] {
  const damagedPanel = panels.get(damagedPanelId);
  if (!damagedPanel) return [];

  const damagedSeq = damagedPanel.install_sequence;
  const damagedDay = damagedPanel.delivery_day;
  const pushed: Panel[] = [];

  // Find all stacked panels in the same delivery day with higher sequence
  for (const panel of panels.values()) {
    if (
      panel.id !== damagedPanelId &&
      panel.delivery_day === damagedDay &&
      panel.install_sequence > damagedSeq &&
      (panel.status === 'stacked' || panel.status === 'pending')
    ) {
      panel.status = 'pending';
      panel.delivery_day = null;
      pushed.push(panel);
    }
  }

  // Remove pushed panels from their stacks
  for (const stack of stacks) {
    if (stack.delivery_day === damagedDay) {
      const pushedIds = new Set(pushed.map((p) => p.id));
      stack.panelIds = stack.panelIds.filter((pid) => !pushedIds.has(pid));
      // Recalculate weight
      stack.total_weight_kg = stack.panelIds.reduce((sum, pid) => {
        const p = panels.get(pid);
        return sum + (p?.weight_kg ?? 0);
      }, 0);
    }
  }

  // Remove empty stacks
  stacks = stacks.filter((s) => s.panelIds.length > 0);

  // Rebuild deliveries
  deliveries.clear();
  for (const stack of stacks) {
    const existing = deliveries.get(stack.delivery_day);
    if (existing) {
      existing.stacks.push(stack);
    } else {
      deliveries.set(stack.delivery_day, {
        delivery_day: stack.delivery_day,
        stacks: [stack],
      });
    }
  }

  return pushed;
}

export function resetDatabase(): void {
  panels.clear();
  (seedData.panels as RawPanel[]).forEach((raw) => {
    panels.set(raw.id, { ...raw, status: 'pending' });
  });
  stacks = [];
  deliveries.clear();
}

/**
 * Validates that the global installation sequence is chronologically respected across days.
 * If panel A has a lower sequence than panel B, panel A cannot be delivered on a later day than B.
 */
export function validateGlobalSequence(combinedStacks: Stack[]): void {
  const proposedDays: Map<string, number> = new Map();
  for (const stack of combinedStacks) {
    for (const pid of stack.panelIds) {
      proposedDays.set(pid, stack.delivery_day);
    }
  }

  const activePanels = getAllPanels().filter(
    (p) => p.status === 'pending' || p.status === 'stacked' || p.status === 'on_order'
  );

  for (const p2 of activePanels) {
    const d2 = proposedDays.get(p2.id);
    if (d2 === undefined) continue; // Not scheduled

    for (const p1 of activePanels) {
      if (p1.install_sequence < p2.install_sequence) {
        const d1 = proposedDays.get(p1.id);
        if (d1 === undefined) {
          throw new Error(
            `Sequence violation: Panel "${p2.id}" (seq #${p2.install_sequence}) is scheduled for Day ${d2}, but its predecessor "${p1.id}" (seq #${p1.install_sequence}) is not scheduled in any stack.`
          );
        }
        if (d1 > d2) {
          throw new Error(
            `Sequence violation: Panel "${p2.id}" (seq #${p2.install_sequence}) is scheduled for Day ${d2}, but its predecessor "${p1.id}" (seq #${p1.install_sequence}) is scheduled for a later day (Day ${d1}).`
          );
        }
      }
    }
  }
}
