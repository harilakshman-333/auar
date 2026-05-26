import type { Panel, Stack, Delivery } from '../types/index.js';
export declare function getAllPanels(): Panel[];
export declare function getPanelById(id: string): Panel | undefined;
export declare function updatePanelStatus(id: string, status: Panel['status']): Panel | undefined;
export declare function getStacks(): Stack[];
export declare function setStacks(newStacks: Stack[]): void;
export declare function getDeliveryByDay(day: number): Delivery | undefined;
export declare function getAllDeliveries(): Delivery[];
/**
 * Returns the next panel that should be installed globally.
 * A panel is "next" if it has the lowest install_sequence
 * among all non-installed, non-damaged panels.
 */
export declare function getNextSequentialPanel(): Panel | undefined;
export declare function getProjectInfo(): {
    id: string;
    name: string;
    client: string;
    site_address: string;
    site_foreman: string;
};
export declare function resetDatabase(): void;
//# sourceMappingURL=db.d.ts.map