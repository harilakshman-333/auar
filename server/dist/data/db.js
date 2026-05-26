"use strict";
// ──────────────────────────────────────────────
// In-Memory Data Store
// Initializes from seed.json, provides CRUD access
// ──────────────────────────────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPanels = getAllPanels;
exports.getPanelById = getPanelById;
exports.updatePanelStatus = updatePanelStatus;
exports.getStacks = getStacks;
exports.setStacks = setStacks;
exports.getDeliveryByDay = getDeliveryByDay;
exports.getAllDeliveries = getAllDeliveries;
exports.getNextSequentialPanel = getNextSequentialPanel;
exports.getProjectInfo = getProjectInfo;
exports.resetDatabase = resetDatabase;
const seed_json_1 = __importDefault(require("./seed.json"));
// ── Panels ───────────────────────────────────
const panels = new Map();
seed_json_1.default.panels.forEach((raw) => {
    panels.set(raw.id, { ...raw, status: 'pending' });
});
// ── Stacks & Deliveries ──────────────────────
let stacks = [];
let deliveries = new Map();
// ── Panel Accessors ──────────────────────────
function getAllPanels() {
    return Array.from(panels.values()).sort((a, b) => a.install_sequence - b.install_sequence);
}
function getPanelById(id) {
    return panels.get(id);
}
function updatePanelStatus(id, status) {
    const panel = panels.get(id);
    if (!panel)
        return undefined;
    panel.status = status;
    return panel;
}
// ── Stack / Delivery Accessors ───────────────
function getStacks() {
    return stacks;
}
function setStacks(newStacks) {
    // 1. Identify historical stacks (any stack containing an installed panel)
    const historicalStacks = stacks.filter((stack) => stack.panelIds.some((pid) => panels.get(pid)?.status === 'installed'));
    // Get the list of panel IDs that are in historical stacks
    const historicalPanelIds = new Set(historicalStacks.flatMap((s) => s.panelIds));
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
    const filteredNewStacks = newStacks.filter((stack) => stack.panelIds.every((pid) => !historicalPanelIds.has(pid)));
    // 4. Combine historical stacks and new stacks, re-indexing stack IDs to avoid duplicates
    const combinedStacks = [...historicalStacks];
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
        }
        else {
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
function getDeliveryByDay(day) {
    return deliveries.get(day);
}
function getAllDeliveries() {
    return Array.from(deliveries.values()).sort((a, b) => a.delivery_day - b.delivery_day);
}
// ── Sequence Validation ──────────────────────
/**
 * Returns the next panel that should be installed globally.
 * A panel is "next" if it has the lowest install_sequence
 * among all non-installed, non-damaged panels.
 */
function getNextSequentialPanel() {
    return getAllPanels().find((p) => p.status !== 'installed' && p.status !== 'damaged');
}
function getProjectInfo() {
    return seed_json_1.default.project;
}
function resetDatabase() {
    panels.clear();
    seed_json_1.default.panels.forEach((raw) => {
        panels.set(raw.id, { ...raw, status: 'pending' });
    });
    stacks = [];
    deliveries.clear();
}
//# sourceMappingURL=db.js.map