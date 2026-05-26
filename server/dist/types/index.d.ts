export type PanelType = 'external_wall' | 'internal_wall' | 'floor_cassette' | 'roof_panel';
export type PanelZone = 'north' | 'south' | 'east' | 'west' | 'internal' | 'floor' | 'roof';
export type PanelStatus = 'pending' | 'stacked' | 'installed' | 'damaged';
export interface Panel {
    id: string;
    type: PanelType;
    level: number;
    zone: PanelZone;
    width_mm: number;
    height_mm: number;
    thickness_mm: number;
    weight_kg: number;
    install_sequence: number;
    delivery_day: number | null;
    notes: string;
    status: PanelStatus;
}
export interface Stack {
    id: string;
    delivery_day: number;
    total_weight_kg: number;
    target_zone: string;
    panelIds: string[];
}
export interface Delivery {
    delivery_day: number;
    stacks: Stack[];
}
/** Raw panel shape from the seed JSON (no status field) */
export interface RawPanel {
    id: string;
    type: PanelType;
    level: number;
    zone: PanelZone;
    width_mm: number;
    height_mm: number;
    thickness_mm: number;
    weight_kg: number;
    install_sequence: number;
    delivery_day: number | null;
    notes: string;
}
//# sourceMappingURL=index.d.ts.map