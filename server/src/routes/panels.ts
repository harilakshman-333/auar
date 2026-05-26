// ──────────────────────────────────────────────
// Panels API Routes
// ──────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import {
  getAllPanels,
  getPanelById,
  updatePanelStatus,
  getNextSequentialPanel,
  getDependencyStatus,
  commissionReplacement,
  pushBlockedPanels,
} from '../data/db.js';

const router = Router();

// GET /api/panels — Return all panels with current status + dependency info
router.get('/', (_req: Request, res: Response) => {
  const panels = getAllPanels();
  const deps = getDependencyStatus();
  const enriched = panels.map((p) => ({
    ...p,
    dependency: deps[p.id] ?? { locked: false, reason: '', blockedBy: [] },
  }));
  res.json(enriched);
});

// PATCH /api/panels/:id/status — Update panel status
router.patch('/:id/status', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  // Validate status value
  if (!status || !['installed', 'damaged', 'stacked', 'pending', 'on_order'].includes(status)) {
    res.status(400).json({
      error: 'Invalid status. Must be "installed", "damaged", "stacked", "pending", or "on_order".',
    });
    return;
  }

  const panel = getPanelById(id);
  if (!panel) {
    res.status(404).json({ error: `Panel "${id}" not found.` });
    return;
  }

  // ── Sequence Validation ──────────────────
  // If marking as 'installed', verify this panel is the next in global sequence
  if (status === 'installed') {
    const nextPanel = getNextSequentialPanel();
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

  const updated = updatePanelStatus(id, status);
  res.json(updated);
});

// POST /api/panels/:id/commission-replacement — Commission a replacement for a damaged panel
router.post('/:id/commission-replacement', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const panel = getPanelById(id);

  if (!panel) {
    res.status(404).json({ error: `Panel "${id}" not found.` });
    return;
  }

  if (panel.status !== 'damaged') {
    res.status(400).json({ error: `Panel "${id}" is not damaged. Only damaged panels can be replaced.` });
    return;
  }

  const replacement = commissionReplacement(id);
  if (!replacement) {
    res.status(500).json({ error: 'Failed to commission replacement.' });
    return;
  }

  res.json({
    replacement,
    message: `Replacement "${replacement.id}" commissioned for damaged "${id}".`,
  });
});

// POST /api/panels/:id/push-blocked — Push all panels blocked by a damaged panel
router.post('/:id/push-blocked', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const panel = getPanelById(id);

  if (!panel) {
    res.status(404).json({ error: `Panel "${id}" not found.` });
    return;
  }

  const pushed = pushBlockedPanels(id);
  res.json({
    pushed: pushed.map((p) => p.id),
    count: pushed.length,
    message: `${pushed.length} panel(s) un-assigned from delivery day and set to pending.`,
  });
});

export default router;
