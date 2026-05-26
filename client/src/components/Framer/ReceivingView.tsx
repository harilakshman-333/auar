// ──────────────────────────────────────────────
// Framer — Receiving View (Stage 1)
// Shows incoming stacks for the day and drop zones
// ──────────────────────────────────────────────

import type { Stack, Panel } from '../../types';

interface ReceivingViewProps {
  stacks: Stack[];
  panels: Panel[];
  deliveryDay: number;
  onStartAssembly: () => void;
}

export default function ReceivingView({
  stacks,
  panels,
  deliveryDay,
  onStartAssembly,
}: ReceivingViewProps) {
  const panelMap = new Map(panels.map((p) => [p.id, p]));

  if (stacks.length === 0) {
    return (
      <div className="receiving receiving--empty">
        <div className="receiving__empty-icon">📦</div>
        <h2>No Deliveries Today</h2>
        <p>No stacks are scheduled for Day {deliveryDay}.</p>
      </div>
    );
  }

  return (
    <div className="receiving" id="framer-receiving">
      <div className="receiving__header">
        <span className="receiving__day-badge">DAY {deliveryDay}</span>
        <h2>Incoming Deliveries</h2>
        <p>{stacks.length} stack{stacks.length !== 1 ? 's' : ''} arriving</p>
      </div>

      <div className="receiving__stacks">
        {stacks.map((stack) => {
          const totalPanels = stack.panelIds.length;
          return (
            <div key={stack.id} className="receiving__stack-card">
              <div className="receiving__stack-top">
                <span className="receiving__stack-id">{stack.id}</span>
                <span className="receiving__stack-weight">
                  {stack.total_weight_kg}kg
                </span>
              </div>
              <div className="receiving__stack-zone">
                <span className="receiving__zone-icon">📍</span>
                <span>Drop at: <strong>{stack.target_zone.toUpperCase()}</strong> zone</span>
              </div>
              <div className="receiving__stack-info">
                {totalPanels} panel{totalPanels !== 1 ? 's' : ''} &middot; First up:{' '}
                <strong>{stack.panelIds[0]}</strong>
                {panelMap.get(stack.panelIds[0]) && (
                  <span> ({panelMap.get(stack.panelIds[0])!.weight_kg}kg)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="receiving__start-btn"
        onClick={onStartAssembly}
        id="start-assembly-btn"
      >
        START ASSEMBLY
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
