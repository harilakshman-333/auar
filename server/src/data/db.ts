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
  return panel;
}

// ── Stack / Delivery Accessors ───────────────
export function getStacks(): Stack[] {
  return stacks;
}

export function setStacks(newStacks: Stack[]): void {
  // 1. Identify historical stacks (any stack containing an installed panel)
  const historicalStacks = stacks.filter((stack) =>
    stack.panelIds.some((pid) => panels.get(pid)?.status === 'installed')
  );

  // Get the list of panel IDs that are in historical stacks
  const historicalPanelIds = new Set(
    historicalStacks.flatMap((s) => s.panelIds)
  );

  // 2. Reset status and delivery_day of all active panels NOT in historical stacks
  for (const panel of panels.values()) {
    if (historicalPanelIds.has(panel.id)) {
      continue; // Keep historical panels as they are
    }
    if (panel.status === 'stacked') {
      panel.status = 'pending';
    }
    if (panel.status === 'pending') {
      panel.delivery_day = null;
    }
  }

  // 3. Filter the new AI stacks to ensure they don't contain any panels from historical stacks
  const filteredNewStacks = newStacks.filter((stack) =>
    stack.panelIds.every((pid) => !historicalPanelIds.has(pid))
  );

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
 * among all non-installed, non-damaged panels.
 */
export function getNextSequentialPanel(): Panel | undefined {
  return getAllPanels().find(
    (p) => p.status !== 'installed' && p.status !== 'damaged'
  );
}

export function getProjectInfo() {
  return seedData.project;
}

export function resetDatabase(): void {
  panels.clear();
  (seedData.panels as RawPanel[]).forEach((raw) => {
    panels.set(raw.id, { ...raw, status: 'pending' });
  });
  stacks = [];
  deliveries.clear();
}
