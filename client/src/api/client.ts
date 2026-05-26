// ──────────────────────────────────────────────
// API Client — Communicates with the Express server
// ──────────────────────────────────────────────

import type { Panel, Stack, Delivery } from '../types';

const API_BASE = 'http://localhost:3001/api';

// ── Panels ───────────────────────────────────
export async function fetchPanels(): Promise<Panel[]> {
  const res = await fetch(`${API_BASE}/panels`);
  if (!res.ok) throw new Error('Failed to fetch panels');
  return res.json();
}

export async function updatePanelStatus(
  id: string,
  status: 'installed' | 'damaged' | 'stacked' | 'pending'
): Promise<Panel> {
  const res = await fetch(`${API_BASE}/panels/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update panel status');
  }
  return res.json();
}

// ── Deliveries ───────────────────────────────
export async function fetchDeliveries(): Promise<Delivery[]> {
  const res = await fetch(`${API_BASE}/deliveries`);
  if (!res.ok) throw new Error('Failed to fetch deliveries');
  return res.json();
}

export async function fetchDeliveryByDay(day: number): Promise<Delivery> {
  const res = await fetch(`${API_BASE}/deliveries?day=${day}`);
  if (!res.ok) throw new Error(`Failed to fetch delivery for day ${day}`);
  return res.json();
}

export async function generateAIPlan(
  command: string
): Promise<{ stacks: Stack[]; reasoning: string }> {
  const res = await fetch(`${API_BASE}/deliveries/ai-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'AI plan generation failed');
  }
  return res.json();
}

export async function resetProjectState(): Promise<void> {
  const res = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset project state');
}
