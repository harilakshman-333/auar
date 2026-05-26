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
  const dayPanels = panels
    .filter((p) => dayPanelIds.includes(p.id))
    .sort((a, b) => a.install_sequence - b.install_sequence);

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

  const allPanelsInstalled = panels.every(
    (p) => p.status === 'installed' || p.status === 'damaged'
  );

  if (stage === 'complete' || (stage === 'assembly' && totalRemaining === 0)) {
    return (
      <div className="framer-dashboard framer-dashboard--complete" id="framer-complete">
        <div className="complete__icon">🏗️</div>
        <h1>{allPanelsInstalled ? 'All Panels Installed' : `Day ${deliveryDay} Complete`}</h1>
        <p>
          {allPanelsInstalled
            ? 'Great work! All panels for this project have been installed.'
            : `All deliverable panels for Day ${deliveryDay} have been installed.`}
        </p>
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

    // Calculate the next globally required sequence (lowest uninstalled sequence)
    const installedSeqs = new Set(
      panels.filter((p) => p.status === 'installed').map((p) => p.install_sequence)
    );
    const allSeqs = panels.map((p) => p.install_sequence);
    const minSeq = allSeqs.length > 0 ? Math.min(...allSeqs) : 1;
    const maxSeq = allSeqs.length > 0 ? Math.max(...allSeqs) : 1;
    let globalNextSeq = minSeq;
    for (let seq = minSeq; seq <= maxSeq; seq++) {
      if (!installedSeqs.has(seq)) {
        globalNextSeq = seq;
        break;
      }
    }

    // We are blocked if the current panel comes after the next globally required sequence
    const isBlocked = currentPanel.install_sequence > globalNextSeq;

    // Find any damaged panels globally that are blocking the current sequence
    const blockingDamagedPanels = panels.filter(
      (p) => p.status === 'damaged' && p.install_sequence < currentPanel.install_sequence
    );

    if (isBlocked && totalRemaining > 0) {
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
            <h2 className="assembly-blocked__title" style={{ color: '#f3f4f6', fontSize: '1.5rem', margin: '16px 0 8px' }}>Assembly Blocked</h2>
            <p className="assembly-blocked__text" style={{ color: '#9ca3af', marginBottom: '20px' }}>
              You cannot install <strong>{currentPanel.id}</strong> (Sequence #{currentPanel.install_sequence}) yet. 
              The project is waiting for Sequence #{globalNextSeq} to be installed first.
            </p>
            {blockingDamagedPanels.length > 0 && (
              <div className="assembly-blocked__damaged-list" style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px' }}>
                <p style={{ fontWeight: '600', color: '#f87171', marginBottom: '8px' }}>
                  The following panel(s) must be replaced and installed first:
                </p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                  {blockingDamagedPanels.map((p) => (
                    <li key={p.id} style={{ color: '#9ca3af', marginBottom: '4px' }}>
                      <strong style={{ color: '#e5e7eb' }}>{p.id}</strong> (Sequence #{p.install_sequence}) — <span style={{ color: '#f87171', textTransform: 'uppercase', fontSize: '0.85em', fontWeight: 'bold' }}>Damaged</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="assembly-blocked__note" style={{ marginTop: '24px', fontSize: '0.9rem', color: '#9ca3af', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              Please notify the Production Manager to commission a replacement and re-plan the sequence using the AI Command Bar.
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
