// ──────────────────────────────────────────────
// Production Manager — Factory Order Export
// Print-optimized manufacturing schedule
// ──────────────────────────────────────────────

import type { Stack, Panel } from '../../types';

interface FactoryOrderProps {
  stacks: Stack[];
  panels: Panel[];
}

export default function FactoryOrder({ stacks, panels }: FactoryOrderProps) {
  const panelMap = new Map(panels.map((p) => [p.id, p]));
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Group stacks by delivery day
  const dayGroups = stacks.reduce<Record<number, Stack[]>>((acc, stack) => {
    if (!acc[stack.delivery_day]) acc[stack.delivery_day] = [];
    acc[stack.delivery_day].push(stack);
    return acc;
  }, {});

  const sortedDays = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);

  // Factory order = reverse LIFO order (bottom panel first = manufactured first)
  let globalOrderNum = 0;

  return (
    <div className="factory-order" id="factory-order-print">
      <div className="factory-order__header">
        <div className="factory-order__logo">◆ AUAR</div>
        <h1>Factory Manufacturing Order</h1>
        <div className="factory-order__meta">
          <div><strong>Project:</strong> Walthamstow Plot 3 — Unit A</div>
          <div><strong>Date Issued:</strong> {today}</div>
          <div><strong>Total Stacks:</strong> {stacks.length}</div>
          <div><strong>Total Panels:</strong> {stacks.reduce((sum, s) => sum + s.panelIds.length, 0)}</div>
        </div>
      </div>

      <div className="factory-order__instructions">
        <strong>⚠ IMPORTANT:</strong> Panels must be manufactured in the order listed below.
        Within each stack, the <em>last panel listed</em> goes on the bottom of the physical stack,
        and the <em>first panel listed</em> goes on top (the framer picks it up first on site).
      </div>

      {sortedDays.map((day) => (
        <div key={day} className="factory-order__day">
          <h2>Delivery Day {day}</h2>
          {dayGroups[day].map((stack) => {
            // Reverse panelIds for manufacturing order (bottom first)
            const mfgOrder = [...stack.panelIds].reverse();
            return (
              <div key={stack.id} className="factory-order__stack">
                <div className="factory-order__stack-header">
                  <span>{stack.id}</span>
                  <span>Zone: {stack.target_zone.toUpperCase()}</span>
                  <span>Weight: {stack.total_weight_kg}kg</span>
                  <span>{stack.panelIds.length} panels</span>
                </div>
                <table className="factory-order__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Mfg Order</th>
                      <th>Panel ID</th>
                      <th>Type</th>
                      <th>Dimensions (W×H×T)</th>
                      <th>Weight</th>
                      <th>Zone</th>
                      <th>Level</th>
                      <th>Stack Position</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mfgOrder.map((pid, mfgIdx) => {
                      globalOrderNum++;
                      const panel = panelMap.get(pid);
                      const stackPosition = stack.panelIds.length - mfgIdx; // bottom = highest number
                      return (
                        <tr key={pid}>
                          <td>{globalOrderNum}</td>
                          <td><strong>{mfgIdx + 1}</strong></td>
                          <td><strong>{pid}</strong></td>
                          <td>{panel?.type.replace('_', ' ') ?? '—'}</td>
                          <td>
                            {panel
                              ? `${panel.width_mm}×${panel.height_mm}×${panel.thickness_mm}mm`
                              : '—'}
                          </td>
                          <td>{panel?.weight_kg ?? '—'}kg</td>
                          <td>{panel?.zone ?? '—'}</td>
                          <td>L{panel?.level ?? '—'}</td>
                          <td>
                            {mfgIdx === stack.panelIds.length - 1
                              ? '▲ TOP (first off)'
                              : mfgIdx === 0
                              ? '▼ BOTTOM'
                              : `${stackPosition}`}
                          </td>
                          <td className="factory-order__notes">{panel?.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ))}

      <div className="factory-order__footer">
        <div className="factory-order__signature">
          <div className="factory-order__sig-line" />
          <span>Production Manager Signature</span>
        </div>
        <div className="factory-order__signature">
          <div className="factory-order__sig-line" />
          <span>Date</span>
        </div>
      </div>
    </div>
  );
}
