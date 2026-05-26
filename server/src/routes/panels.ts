// ──────────────────────────────────────────────
// Panels API Routes
// ──────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import {
  getAllPanels,
  getPanelById,
  updatePanelStatus,
  getNextSequentialPanel,
} from '../data/db.js';

const router = Router();

// GET /api/panels — Return all panels with current status
router.get('/', (_req: Request, res: Response) => {
  const panels = getAllPanels();
  res.json(panels);
});

// PATCH /api/panels/:id/status — Update panel status
router.patch('/:id/status', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  // Validate status value
  if (!status || !['installed', 'damaged', 'stacked', 'pending'].includes(status)) {
    res.status(400).json({
      error: 'Invalid status. Must be "installed", "damaged", "stacked", or "pending".',
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

export default router;
