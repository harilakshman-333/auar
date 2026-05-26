// ──────────────────────────────────────────────
// Production Manager — Panel Inventory Table
// Shows all panels, statuses, dependencies, and replacements
// ──────────────────────────────────────────────

import type { Panel } from '../../types';

interface DependencyInfo {
  locked: boolean;
  reason: string;
  blockedBy: string[];
}

interface EnrichedPanel extends Panel {
  dependency?: DependencyInfo;
}

interface PanelInventoryProps {
  panels: EnrichedPanel[];
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending': return 'badge--pending';
    case 'stacked': return 'badge--stacked';
    case 'installed': return 'badge--installed';
    case 'damaged': return 'badge--damaged';
    case 'on_order': return 'badge--on-order';
    default: return '';
  }
}

export default function PanelInventory({ panels }: PanelInventoryProps) {
  const stats = {
    total: panels.length,
    pending: panels.filter(p => p.status === 'pending').length,
    stacked: panels.filter(p => p.status === 'stacked').length,
    installed: panels.filter(p => p.status === 'installed').length,
    damaged: panels.filter(p => p.status === 'damaged').length,
    onOrder: panels.filter(p => p.status === 'on_order').length,
  };

  return (
    <div className="inventory">
      <div className="inventory__header">
        <h3>Panel Inventory</h3>
        <div className="inventory__stats">
          <span className="inventory__stat">
            <span className="inventory__stat-dot inventory__stat-dot--pending" />
            {stats.pending} Pending
          </span>
          <span className="inventory__stat">
            <span className="inventory__stat-dot inventory__stat-dot--stacked" />
            {stats.stacked} Stacked
          </span>
          <span className="inventory__stat">
            <span className="inventory__stat-dot inventory__stat-dot--installed" />
            {stats.installed} Installed
          </span>
          {stats.damaged > 0 && (
            <span className="inventory__stat">
              <span className="inventory__stat-dot inventory__stat-dot--damaged" />
              {stats.damaged} Damaged
            </span>
          )}
          {stats.onOrder > 0 && (
            <span className="inventory__stat">
              <span className="inventory__stat-dot inventory__stat-dot--on-order" />
              {stats.onOrder} On Order
            </span>
          )}
        </div>
      </div>

      <div className="inventory__table-wrap">
        <table className="inventory__table" id="panel-inventory-table">
          <thead>
            <tr>
              <th>Seq</th>
              <th>Panel ID</th>
              <th>Type</th>
              <th>Zone</th>
              <th>Level</th>
              <th>Weight</th>
              <th>Day</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {panels.map((panel) => {
              const isLocked = panel.dependency?.locked ?? false;
              const isDamaged = panel.status === 'damaged';
              const isReplacement = panel.is_replacement;

              let rowClass = '';
              if (isDamaged) rowClass = 'inventory__row--damaged';
              else if (isLocked) rowClass = 'inventory__row--locked';

              return (
                <tr key={panel.id} className={rowClass}>
                  <td className="inventory__seq">{panel.install_sequence}</td>
                  <td className="inventory__id">
                    {isLocked && <span className="inventory__lock-icon" title={panel.dependency?.reason}>🔒 </span>}
                    {panel.id}
                    {isReplacement && (
                      <span className="inventory__replacement-tag" title={`Replaces ${panel.replaces_panel_id}`}>
                        ↩ {panel.replaces_panel_id}
                      </span>
                    )}
                  </td>
                  <td>{panel.type.replace('_', ' ')}</td>
                  <td>{panel.zone}</td>
                  <td>L{panel.level}</td>
                  <td>{panel.weight_kg}kg</td>
                  <td>{panel.delivery_day ?? '—'}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(panel.status)}`}>
                      {panel.status === 'on_order' ? 'on order' : panel.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dependency legend */}
      {panels.some(p => p.dependency?.locked) && (
        <div className="inventory__dep-legend">
          <span className="inventory__lock-icon">🔒</span>
          <span>Locked panels are waiting for prerequisite installations before they can be delivered.</span>
        </div>
      )}
    </div>
  );
}
