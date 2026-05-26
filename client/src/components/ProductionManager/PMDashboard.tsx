// ──────────────────────────────────────────────
// Production Manager — Dashboard Container
// ──────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import CommandBar from './CommandBar';
import DeliveryManifest from './DeliveryManifest';
import PanelInventory from './PanelInventory';
import { fetchPanels, fetchDeliveries } from '../../api/client';
import type { Panel, Stack } from '../../types';

export default function PMDashboard() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [panelData, deliveryData] = await Promise.all([
        fetchPanels(),
        fetchDeliveries(),
      ]);
      setPanels(panelData);
      const allStacks = deliveryData.flatMap(d => d.stacks);
      setStacks(allStacks);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlanGenerated = (newStacks: Stack[], newReasoning: string) => {
    setStacks(newStacks);
    setReasoning(newReasoning);
    loadData();
  };

  if (loading) {
    return (
      <div className="pm-dashboard pm-dashboard--loading">
        <div className="loader" />
        <p>Loading panel inventory…</p>
      </div>
    );
  }

  return (
    <div className="pm-dashboard" id="pm-dashboard">
      <header className="pm-dashboard__header">
        <div>
          <h1>Delivery Planner</h1>
          <p className="pm-dashboard__subtitle">
            Walthamstow Plot 3 — Unit A &middot; {panels.length} panels
          </p>
        </div>
      </header>

      {panels.filter(p => p.status === 'damaged').length > 0 && (
        <div className="pm-dashboard__warning-alert">
          <span className="pm-dashboard__warning-icon">⚠️</span>
          <div className="pm-dashboard__warning-content">
            <strong>Logistical Exception:</strong> {panels.filter(p => p.status === 'damaged').length} panel(s) ({panels.filter(p => p.status === 'damaged').map(p => p.id).join(', ')}) reported as <strong>DAMAGED</strong>. Use the AI Command Bar below to re-plan the remaining delivery sequence.
          </div>
        </div>
      )}

      <CommandBar onPlanGenerated={handlePlanGenerated} />

      <div className="pm-dashboard__grid">
        <div className="pm-dashboard__manifest">
          <DeliveryManifest
            stacks={stacks}
            panels={panels}
            reasoning={reasoning}
          />
        </div>
        <div className="pm-dashboard__inventory">
          <PanelInventory panels={panels} />
        </div>
      </div>
    </div>
  );
}
