# Data Models

The following TypeScript interfaces define the core entities. The base `Panel` data must map directly to the provided AUAR JSON dataset.

## 1. Panel (Source Entity)
```typescript
export interface Panel {
  id: string;               // e.g., 'EW-L1-N1'
  type: 'external_wall' | 'internal_wall' | 'floor_cassette' | 'roof_panel';
  level: number;            // e.g., 1
  zone: 'north' | 'south' | 'east' | 'west' | 'internal' | 'floor' | 'roof';
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  weight_kg: number;
  install_sequence: number; // Strict global ordering
  delivery_day: number | null; 
  notes: string;
  status: 'pending' | 'stacked' | 'installed' | 'damaged'; 
}

## 2. Stack (Generated Entity)
```typeScript
export interface Stack {
  id: string;               // e.g., 'STACK-01'
  delivery_day: number;
  total_weight_kg: number;  // Must be <= 500 (unless altered by PM Command)
  target_zone: string;      // Derived from the majority of panels inside
  panelIds: string[];       // Array of Panel IDs, STRICTLY ordered LIFO
}

3. Delivery (Grouping Entity)
```typeScript
export interface Delivery {
  delivery_day: number;
  stacks: Stack[];
}