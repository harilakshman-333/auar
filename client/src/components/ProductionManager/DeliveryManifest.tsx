// ──────────────────────────────────────────────
// Production Manager — Delivery Manifest View
// Shows planned stacks with ordered panels inside
// ──────────────────────────────────────────────

import type { Stack, Panel } from '../../types';

interface DeliveryManifestProps {
  stacks: Stack[];
  panels: Panel[];
  reasoning: string | null;
}

function getPanelTypeColor(type: string): string {
  switch (type) {
    case 'external_wall': return 'var(--color-ext-wall)';
    case 'internal_wall': return 'var(--color-int-wall)';
    case 'floor_cassette': return 'var(--color-floor)';
    case 'roof_panel': return 'var(--color-roof)';
    default: return 'var(--color-neutral-400)';
  }
}

function getPanelTypeLabel(type: string): string {
  switch (type) {
    case 'external_wall': return 'EXT';
    case 'internal_wall': return 'INT';
    case 'floor_cassette': return 'FLR';
    case 'roof_panel': return 'ROOF';
    default: return '???';
  }
}

export default function DeliveryManifest({
  stacks,
  panels,
  reasoning,
}: DeliveryManifestProps) {
  const panelMap = new Map(panels.map((p) => [p.id, p]));

  // Group stacks by delivery day
  const dayGroups = stacks.reduce<Record<number, Stack[]>>((acc, stack) => {
    if (!acc[stack.delivery_day]) acc[stack.delivery_day] = [];
    acc[stack.delivery_day].push(stack);
    return acc;
  }, {});

  const sortedDays = Object.keys(dayGroups)
    .map(Number)
    .sort((a, b) => a - b);

  if (stacks.length === 0) {
    return (
      <div className="manifest manifest--empty">
        <div className="manifest__empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </div>
        <h3>No Delivery Plan Yet</h3>
        <p>Use the AI Command Bar above to generate a delivery plan.</p>
      </div>
    );
  }

  return (
    <div className="manifest">
      {reasoning && (
        <div className="manifest__reasoning">
          <div className="manifest__reasoning-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
              <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
            </svg>
          </div>
          <p>{reasoning}</p>
        </div>
      )}

      {sortedDays.map((day) => (
        <div key={day} className="manifest__day">
          <div className="manifest__day-header">
            <h3>Day {day}</h3>
            <span className="manifest__day-count">
              {dayGroups[day].length} stack{dayGroups[day].length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="manifest__stacks">
            {dayGroups[day].map((stack) => (
              <div key={stack.id} className="manifest__stack">
                <div className="manifest__stack-header">
                  <div className="manifest__stack-title">
                    <span className="manifest__stack-id">{stack.id}</span>
                    <span className="manifest__stack-zone">
                      📍 {stack.target_zone}
                    </span>
                  </div>
                  <div className="manifest__stack-weight">
                    <span
                      className={`manifest__weight-value ${
                        stack.total_weight_kg > 500
                          ? 'manifest__weight-value--over'
                          : ''
                      }`}
                    >
                      {stack.total_weight_kg}kg
                    </span>
                    <span className="manifest__weight-limit">/ 500kg</span>
                  </div>
                </div>

                {/* Weight bar */}
                <div className="manifest__weight-bar">
                  <div
                    className={`manifest__weight-fill ${
                      stack.total_weight_kg > 500
                        ? 'manifest__weight-fill--over'
                        : stack.total_weight_kg > 400
                        ? 'manifest__weight-fill--warn'
                        : ''
                    }`}
                    style={{
                      width: `${Math.min(
                        (stack.total_weight_kg / 500) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>

                {/* Panel list — LIFO order (first = top of stack) */}
                <div className="manifest__panels">
                  {stack.panelIds.map((pid, idx) => {
                    const panel = panelMap.get(pid);
                    return (
                      <div
                        key={pid}
                        className={`manifest__panel ${
                          idx === 0 ? 'manifest__panel--top' : ''
                        }`}
                      >
                        <span className="manifest__panel-order">
                          {idx === 0 ? '▲ TOP' : idx + 1}
                        </span>
                        <span
                          className="manifest__panel-type-badge"
                          style={{
                            backgroundColor: panel
                              ? getPanelTypeColor(panel.type)
                              : undefined,
                          }}
                        >
                          {panel ? getPanelTypeLabel(panel.type) : '?'}
                        </span>
                        <span className="manifest__panel-id">{pid}</span>
                        <span className="manifest__panel-weight">
                          {panel?.weight_kg ?? '?'}kg
                        </span>
                        <span className="manifest__panel-seq">
                          seq #{panel?.install_sequence ?? '?'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
