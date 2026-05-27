// ──────────────────────────────────────────────
// API Client — Communicates with the Express server
// ──────────────────────────────────────────────

import type { Panel, Stack, Delivery } from '../types';

const API_BASE = window.location.origin.includes('localhost:5173')
  ? 'http://localhost:3001/api'
  : '/api';

// ── Panels ───────────────────────────────────
export async function fetchPanels(): Promise<Panel[]> {
  const res = await fetch(`${API_BASE}/panels`);
  if (!res.ok) throw new Error('Failed to fetch panels');
  return res.json();
}

export async function updatePanelStatus(
  id: string,
  status: 'installed' | 'damaged' | 'stacked' | 'pending' | 'on_order'
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

// ── Commission Replacement ───────────────────
export async function commissionReplacement(
  panelId: string
): Promise<{ replacement: Panel; message: string }> {
  const res = await fetch(`${API_BASE}/panels/${panelId}/commission-replacement`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to commission replacement');
  }
  return res.json();
}

// ── Push Blocked Panels ─────────────────────
export async function pushBlockedPanels(
  panelId: string
): Promise<{ pushed: string[]; count: number; message: string }> {
  const res = await fetch(`${API_BASE}/panels/${panelId}/push-blocked`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to push blocked panels');
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

// ── AI Planning (returns pending plan for approval) ──
export interface AIPlanResponse {
  type: 'plan_update' | 'conversational';
  pendingStacks?: Stack[];
  currentStacks?: Stack[];
  stacks?: Stack[];
  reasoning: string;
}

export async function generateAIPlan(
  command: string
): Promise<AIPlanResponse> {
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

// ── Commit Approved Plan ─────────────────────
export async function commitPlan(
  stacks: Stack[]
): Promise<{ stacks: Stack[]; message: string }> {
  const res = await fetch(`${API_BASE}/deliveries/commit-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stacks }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to commit plan');
  }
  return res.json();
}

// ── Save Manual Stack Edits ──────────────────
export async function saveManualStacks(
  stacks: Stack[]
): Promise<{ stacks: Stack[]; message: string }> {
  const res = await fetch(`${API_BASE}/deliveries/stacks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stacks }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save stack edits');
  }
  return res.json();
}

// ── System Reset ─────────────────────────────
export async function resetProjectState(): Promise<void> {
  const res = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset project state');
}
