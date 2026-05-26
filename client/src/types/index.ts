// ──────────────────────────────────────────────
// AUAR Panel Delivery System — Core Data Models
// ──────────────────────────────────────────────

export type PanelType = 'external_wall' | 'internal_wall' | 'floor_cassette' | 'roof_panel';
export type PanelZone = 'north' | 'south' | 'east' | 'west' | 'internal' | 'floor' | 'roof';
export type PanelStatus = 'pending' | 'stacked' | 'installed' | 'damaged';

export interface Panel {
  id: string;                 // e.g., 'EW-L1-N1'
  type: PanelType;
  level: number;              // e.g., 1
  zone: PanelZone;
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  weight_kg: number;
  install_sequence: number;   // Strict global ordering
  delivery_day: number | null;
  notes: string;
  status: PanelStatus;
}

export interface Stack {
  id: string;                 // e.g., 'STACK-01'
  delivery_day: number;
  total_weight_kg: number;    // Must be <= 500 (unless altered by PM Command)
  target_zone: string;        // Derived from the majority of panels inside
  panelIds: string[];         // Array of Panel IDs, STRICTLY ordered LIFO
}

export interface Delivery {
  delivery_day: number;
  stacks: Stack[];
}
