// ──────────────────────────────────────────────
// Production Manager — Panel Inventory Table
// Shows all panels and their statuses
// ──────────────────────────────────────────────

import type { Panel } from '../../types';

interface PanelInventoryProps {
  panels: Panel[];
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending': return 'badge--pending';
    case 'stacked': return 'badge--stacked';
    case 'installed': return 'badge--installed';
    case 'damaged': return 'badge--damaged';
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
            {panels.map((panel) => (
              <tr key={panel.id} className={panel.status === 'damaged' ? 'inventory__row--damaged' : ''}>
                <td className="inventory__seq">{panel.install_sequence}</td>
                <td className="inventory__id">{panel.id}</td>
                <td>{panel.type.replace('_', ' ')}</td>
                <td>{panel.zone}</td>
                <td>L{panel.level}</td>
                <td>{panel.weight_kg}kg</td>
                <td>{panel.delivery_day ?? '—'}</td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(panel.status)}`}>
                    {panel.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
