// ──────────────────────────────────────────────
// AUAR Panel Delivery System — Server Entry Point
// ──────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import panelRoutes from './routes/panels.js';
import deliveryRoutes from './routes/deliveries.js';
import { resetDatabase } from './data/db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────
app.use('/api/panels', panelRoutes);
app.use('/api/deliveries', deliveryRoutes);

// Reset database endpoint
app.post('/api/reset', (_req, res) => {
  resetDatabase();
  res.json({ status: 'success', message: 'Database reset to initial seed state.' });
});

// ── Health check ─────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏗️  AUAR Server running on http://localhost:${PORT}\n`);
});
