// ──────────────────────────────────────────────
// Framer — Dashboard Container
// Manages receiving → assembly flow
// NO AI features — purely ergonomic
// ──────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import ReceivingView from './ReceivingView';
import AssemblyView from './AssemblyView';
import {
  fetchPanels,
  fetchDeliveries,
  updatePanelStatus,
} from '../../api/client';
import type { Panel, Stack } from '../../types';

type FramerStage = 'receiving' | 'assembly' | 'complete';

export default function FramerDashboard() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [stage, setStage] = useState<FramerStage>('receiving');
  const [deliveryDay, setDeliveryDay] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [panelData, deliveryData] = await Promise.all([
        fetchPanels(),
        fetchDeliveries(),
      ]);
      setPanels(panelData);

      // Get stacks for the selected delivery day
      const dayDelivery = deliveryData.find(
        (d) => d.delivery_day === deliveryDay
      );
      setStacks(dayDelivery?.stacks ?? []);
    } catch (err) {
      console.error('Failed to load framer data:', err);
    } finally {
      setLoading(false);
    }
  }, [deliveryDay]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived state for the currently selected day
  const dayPanelIds = stacks.flatMap((s) => s.panelIds);
  const dayPanels = panels.filter((p) => dayPanelIds.includes(p.id));

  // Sync focused index if entering assembly mode and not set
  useEffect(() => {
    if (stage === 'assembly' && focusedIndex === null && dayPanels.length > 0) {
      const nextActiveIndex = dayPanels.findIndex(
        (p) => p.status !== 'installed' && p.status !== 'damaged'
      );
      setFocusedIndex(nextActiveIndex !== -1 ? nextActiveIndex : 0);
    }
  }, [stage, focusedIndex, dayPanels]);

  const totalRemaining = dayPanels.filter(
    (p) => p.status !== 'installed' && p.status !== 'damaged'
  ).length;

  const handleStartAssembly = () => {
    const nextActiveIndex = dayPanels.findIndex(
      (p) => p.status !== 'installed' && p.status !== 'damaged'
    );
    setFocusedIndex(nextActiveIndex !== -1 ? nextActiveIndex : 0);
    setStage('assembly');
  };

  const handleMarkInstalled = async (id: string) => {
    await updatePanelStatus(id, 'installed');
    await loadData();
    const updated = await fetchPanels();
    const updatedDayPanels = updated.filter((p) => dayPanelIds.includes(p.id));
    const nextActiveIndex = updatedDayPanels.findIndex(
      (p) => p.status !== 'installed' && p.status !== 'damaged'
    );
    if (nextActiveIndex !== -1) {
      setFocusedIndex(nextActiveIndex);
    } else {
      setStage('complete');
    }
  };

  const handleReportDamaged = async (id: string) => {
    await updatePanelStatus(id, 'damaged');
    await loadData();
    const updated = await fetchPanels();
    const updatedDayPanels = updated.filter((p) => dayPanelIds.includes(p.id));
    const nextActiveIndex = updatedDayPanels.findIndex(
      (p) => p.status !== 'installed' && p.status !== 'damaged'
    );
    if (nextActiveIndex !== -1) {
      setFocusedIndex(nextActiveIndex);
    } else {
      setStage('complete');
    }
  };

  const handleResetStatus = async (id: string) => {
    // If the panel is part of any stack, it should go back to 'stacked', otherwise 'pending'
    const isInAnyStack = stacks.some((s) => s.panelIds.includes(id));
    const statusToSet = isInAnyStack ? 'stacked' : 'pending';
    await updatePanelStatus(id, statusToSet);
    await loadData();
  };

  const handlePrev = () => {
    if (focusedIndex !== null && focusedIndex > 0) {
      setFocusedIndex(focusedIndex - 1);
    }
  };

  const handleNext = () => {
    if (focusedIndex !== null && focusedIndex < dayPanels.length - 1) {
      setFocusedIndex(focusedIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="framer-dashboard framer-dashboard--loading">
        <div className="loader loader--light" />
        <p>Loading site data…</p>
      </div>
    );
  }

  if (stage === 'complete') {
    return (
      <div className="framer-dashboard framer-dashboard--complete" id="framer-complete">
        <div className="complete__icon">🏗️</div>
        <h1>All Panels Installed</h1>
        <p>Great work! All panels for this project have been installed.</p>
        <button
          className="framer-dashboard__back"
          onClick={() => {
            setStage('receiving');
            setFocusedIndex(null);
          }}
          style={{ marginTop: '20px', textDecoration: 'underline' }}
        >
          View Daily Stacks
        </button>
      </div>
    );
  }

  if (stage === 'assembly' && focusedIndex !== null && dayPanels[focusedIndex]) {
    const currentPanel = dayPanels[focusedIndex];

    // Check if any panel in the current day's delivery stacks is reported as damaged
    const damagedPanelsInDay = dayPanels.filter(
      (p) => p.status === 'damaged'
    );

    if (damagedPanelsInDay.length > 0) {
      return (
        <div className="framer-dashboard">
          <button
            className="framer-dashboard__back"
            onClick={() => {
              setStage('receiving');
              setFocusedIndex(null);
            }}
          >
            ← Back to Receiving
          </button>
          <div className="assembly-blocked">
            <div className="assembly-blocked__icon">⚠️</div>
            <h2>Assembly Blocked</h2>
            <p>
              The following panel(s) in today's delivery have been reported as <strong>DAMAGED</strong>:
            </p>
            <div className="assembly-blocked__list">
              {damagedPanelsInDay.map((p) => (
                <div key={p.id} className="assembly-blocked__item">
                  <span>
                    <strong>{p.id}</strong> (Sequence #{p.install_sequence})
                  </span>
                  <button
                    className="assembly-blocked__undo-btn"
                    onClick={() => handleResetStatus(p.id)}
                  >
                    Undo / Reset to Stacked
                  </button>
                </div>
              ))}
            </div>
            <p className="assembly-blocked__note">
              Please notify the Production Manager to re-plan the remaining sequence using the AI Command Bar.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="framer-dashboard">
        <button
          className="framer-dashboard__back"
          onClick={() => {
            setStage('receiving');
            setFocusedIndex(null);
          }}
        >
          ← Back to Receiving
        </button>
        <AssemblyView
          currentPanel={currentPanel}
          totalRemaining={totalRemaining}
          totalPanels={dayPanels.length}
          onMarkInstalled={handleMarkInstalled}
          onReportDamaged={handleReportDamaged}
          onResetStatus={handleResetStatus}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={focusedIndex > 0}
          hasNext={focusedIndex < dayPanels.length - 1}
        />
      </div>
    );
  }

  return (
    <div className="framer-dashboard">
      <div className="framer-dashboard__day-selector">
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            className={`framer-dashboard__day-btn ${
              d === deliveryDay ? 'framer-dashboard__day-btn--active' : ''
            }`}
            onClick={() => {
              setDeliveryDay(d);
              setLoading(true);
            }}
          >
            Day {d}
          </button>
        ))}
      </div>
      <ReceivingView
        stacks={stacks}
        panels={panels}
        deliveryDay={deliveryDay}
        onStartAssembly={handleStartAssembly}
      />
    </div>
  );
}
