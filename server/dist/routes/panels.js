"use strict";
// ──────────────────────────────────────────────
// Panels API Routes
// ──────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../data/db.js");
const router = (0, express_1.Router)();
// GET /api/panels — Return all panels with current status
router.get('/', (_req, res) => {
    const panels = (0, db_js_1.getAllPanels)();
    res.json(panels);
});
// PATCH /api/panels/:id/status — Update panel status
router.patch('/:id/status', (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    // Validate status value
    if (!status || !['installed', 'damaged', 'stacked', 'pending'].includes(status)) {
        res.status(400).json({
            error: 'Invalid status. Must be "installed", "damaged", "stacked", or "pending".',
        });
        return;
    }
    const panel = (0, db_js_1.getPanelById)(id);
    if (!panel) {
        res.status(404).json({ error: `Panel "${id}" not found.` });
        return;
    }
    // ── Sequence Validation ──────────────────
    // If marking as 'installed', verify this panel is the next in global sequence
    if (status === 'installed') {
        const nextPanel = (0, db_js_1.getNextSequentialPanel)();
        if (!nextPanel || nextPanel.id !== id) {
            res.status(409).json({
                error: `Cannot install "${id}". The next required panel is "${nextPanel?.id ?? 'none'}".`,
                expected: nextPanel?.id ?? null,
                requested: id,
            });
            return;
        }
    }
    if (status === 'damaged') {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const damageNote = `[DAMAGED at ${timestamp}] Reported by Framer.`;
        panel.notes = panel.notes ? `${panel.notes} | ${damageNote}` : damageNote;
    }
    const updated = (0, db_js_1.updatePanelStatus)(id, status);
    res.json(updated);
});
exports.default = router;
//# sourceMappingURL=panels.js.map