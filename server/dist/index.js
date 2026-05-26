"use strict";
// ──────────────────────────────────────────────
// AUAR Panel Delivery System — Server Entry Point
// ──────────────────────────────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const panels_js_1 = __importDefault(require("./routes/panels.js"));
const deliveries_js_1 = __importDefault(require("./routes/deliveries.js"));
const db_js_1 = require("./data/db.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ── Middleware ────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ── Routes ───────────────────────────────────
app.use('/api/panels', panels_js_1.default);
app.use('/api/deliveries', deliveries_js_1.default);
// Reset database endpoint
app.post('/api/reset', (_req, res) => {
    (0, db_js_1.resetDatabase)();
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
//# sourceMappingURL=index.js.map