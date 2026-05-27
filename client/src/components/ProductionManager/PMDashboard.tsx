// ──────────────────────────────────────────────
// Production Manager — Dashboard Container
// Plan approval, commissioning, manual edit, factory export
// ──────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import CommandBar from './CommandBar';
import DeliveryManifest from './DeliveryManifest';
import PanelInventory from './PanelInventory';
import StackEditor from './StackEditor';
import FactoryOrder from './FactoryOrder';
import {
  fetchPanels,
  fetchDeliveries,
  commitPlan,
  saveManualStacks,
  commissionReplacement as apiCommissionReplacement,
  pushBlockedPanels as apiPushBlockedPanels,
} from '../../api/client';
import type { Panel, Stack } from '../../types';
import type { AIPlanResponse } from '../../api/client';

export default function PMDashboard() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Plan approval state
  const [pendingPlan, setPendingPlan] = useState<Stack[] | null>(null);
  const [pendingReasoning, setPendingReasoning] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  // Manual edit mode (for committed stacks)
  const [editMode, setEditMode] = useState(false);

  // Pending plan edit mode (for AI-proposed plan before approval)
  const [editPendingMode, setEditPendingMode] = useState(false);

  // Factory order print mode
  const [showFactoryOrder, setShowFactoryOrder] = useState(false);
  const factoryOrderRef = useRef<HTMLDivElement>(null);

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

  // ── AI Plan Response Handler ───────────────
  const handlePlanGenerated = (response: AIPlanResponse) => {
    if (response.type === 'plan_update' && response.pendingStacks) {
      // Show proposed plan for approval
      setPendingPlan(response.pendingStacks);
      setPendingReasoning(response.reasoning);
    } else {
      // Conversational response — just show the reasoning
      setReasoning(response.reasoning);
    }
  };

  // ── Approve Pending Plan ───────────────────
  const handleApprovePlan = async () => {
    if (!pendingPlan) return;
    setApproving(true);
    try {
      const result = await commitPlan(pendingPlan);
      setStacks(result.stacks);
      setReasoning(pendingReasoning);
      setPendingPlan(null);
      setPendingReasoning(null);
      await loadData();
    } catch (err: any) {
      alert('Failed to approve plan: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  // ── Discard Pending Plan ───────────────────
  const handleDiscardPlan = () => {
    setPendingPlan(null);
    setPendingReasoning(null);
    setEditPendingMode(false);
  };

  // ── Save Edits to Pending Plan (before approval) ───
  const handleSavePendingEdits = async (editedStacks: Stack[]) => {
    // Just update the pendingPlan in memory — don't commit yet
    setPendingPlan(editedStacks);
    setEditPendingMode(false);
  };

  // ── Commission Replacement ─────────────────
  const handleCommission = async (panelId: string) => {
    try {
      const result = await apiCommissionReplacement(panelId);
      alert(result.message);
      await loadData();
    } catch (err: any) {
      alert('Failed to commission replacement: ' + err.message);
    }
  };

  // ── Push Blocked Panels ────────────────────
  const handlePushBlocked = async (panelId: string) => {
    try {
      const result = await apiPushBlockedPanels(panelId);
      alert(result.message);
      await loadData();
    } catch (err: any) {
      alert('Failed to push blocked panels: ' + err.message);
    }
  };

  // ── Manual Stack Save ──────────────────────
  const handleSaveManualEdits = async (editedStacks: Stack[]) => {
    const result = await saveManualStacks(editedStacks);
    setStacks(result.stacks);
    setEditMode(false);
    await loadData();
  };

  // ── Print Factory Order ────────────────────
  const handlePrintFactory = () => {
    setShowFactoryOrder(true);
    setTimeout(() => {
      window.print();
      setShowFactoryOrder(false);
    }, 300);
  };

  // ── Build dependency map for manifest ──────
  const depMap: Record<string, { locked: boolean }> = {};
  for (const p of panels) {
    const dep = (p as any).dependency;
    if (dep) depMap[p.id] = { locked: dep.locked };
  }

  const damagedPanels = panels.filter(p => p.status === 'damaged');
  const damagedWithoutReplacement = damagedPanels.filter(dp =>
    !panels.some(p => p.is_replacement && p.replaces_panel_id === dp.id)
  );

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
        <div className="pm-dashboard__actions">
          {stacks.length > 0 && !editMode && (
            <>
              <button
                className="pm-dashboard__action-btn pm-dashboard__action-btn--edit"
                onClick={() => setEditMode(true)}
              >
                ✏️ Manual Edit
              </button>
              <button
                className="pm-dashboard__action-btn pm-dashboard__action-btn--print"
                onClick={handlePrintFactory}
              >
                🖨 Print Factory Order
              </button>
            </>
          )}
        </div>
      </header>

      {/* Damage Alert with Commission & Push Controls */}
      {damagedPanels.length > 0 && (
        <div className="pm-dashboard__warning-alert">
          <span className="pm-dashboard__warning-icon">⚠️</span>
          <div className="pm-dashboard__warning-content">
            <strong>Logistical Exception:</strong> {damagedPanels.length} panel(s) reported as <strong>DAMAGED</strong>.
            <div className="pm-dashboard__damage-actions">
              {damagedPanels.map((dp) => (
                <div key={dp.id} className="pm-dashboard__damage-row">
                  <span className="pm-dashboard__damage-id">{dp.id}</span>
                  {damagedWithoutReplacement.some(d => d.id === dp.id) && (
                    <button
                      className="pm-dashboard__commission-btn"
                      onClick={() => handleCommission(dp.id)}
                    >
                      🏭 Commission Replacement
                    </button>
                  )}
                  <button
                    className="pm-dashboard__push-btn"
                    onClick={() => handlePushBlocked(dp.id)}
                  >
                    ↗ Push Blocked Panels
                  </button>
                </div>
              ))}
            </div>
            <div className="pm-dashboard__warning-note" style={{ marginTop: '12px', fontSize: '0.82rem', opacity: 0.95, borderTop: '1px dashed rgba(239,68,68,0.2)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <strong>🏭 Commission Replacement:</strong> Registers a new duplicate replacement panel (with a <code>-R1</code> suffix) inside the factory production queue so it can be re-scheduled on a future stack/delivery day.
                </div>
                <div>
                  <strong>↗ Push Blocked Panels:</strong> Automatically unschedules all downstream panels that require this damaged panel to be installed first, pushing them back to the unassigned pool to satisfy sequence dependencies.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Approval Bar */}
      {pendingPlan && !editPendingMode && (
        <div className="plan-preview-bar">
          <div className="plan-preview-bar__text">
            <span className="plan-preview-bar__icon">📋</span>
            <span><strong>PROPOSED PLAN</strong> — Review and approve below</span>
          </div>
          <div className="plan-preview-bar__buttons">
            <button
              className="plan-preview-bar__discard"
              onClick={handleDiscardPlan}
              disabled={approving}
            >
              ✕ Discard
            </button>
            <button
              className="plan-preview-bar__edit"
              onClick={() => setEditPendingMode(true)}
              disabled={approving}
            >
              ✏️ Edit Plan
            </button>
            <button
              className="plan-preview-bar__approve"
              onClick={handleApprovePlan}
              disabled={approving}
            >
              {approving ? 'Saving…' : '✓ Approve Plan'}
            </button>
          </div>
        </div>
      )}

      <CommandBar onPlanGenerated={handlePlanGenerated} />

      <div className="pm-dashboard__grid">
        <div className="pm-dashboard__manifest">
          {editPendingMode && pendingPlan ? (
            // Drag-and-drop editor for the AI-proposed plan (before approval)
            <StackEditor
              stacks={pendingPlan}
              panels={panels}
              onSave={handleSavePendingEdits}
              onCancel={() => setEditPendingMode(false)}
              saveLabel="💾 Save to Plan"
              title="✏️ Editing Proposed Plan"
              subtitle="Drag panels between stacks. Click &quot;Save to Plan&quot; when done -- you can still Approve or Discard after."
            />
          ) : editMode ? (
            // Drag-and-drop editor for committed stacks
            <StackEditor
              stacks={stacks}
              panels={panels}
              onSave={handleSaveManualEdits}
              onCancel={() => setEditMode(false)}
            />
          ) : (
            <>
              {/* Show pending plan preview if exists */}
              {pendingPlan && (
                <DeliveryManifest
                  stacks={pendingPlan}
                  panels={panels}
                  reasoning={pendingReasoning}
                  isPending={true}
                  dependencies={depMap}
                />
              )}
              {/* Show committed stacks */}
              <DeliveryManifest
                stacks={stacks}
                panels={panels}
                reasoning={!pendingPlan ? reasoning : null}
                dependencies={depMap}
              />
            </>
          )}
        </div>
        <div className="pm-dashboard__inventory">
          <PanelInventory panels={panels} />
        </div>
      </div>

      {/* Hidden Factory Order (rendered for print) */}
      {showFactoryOrder && (
        <div ref={factoryOrderRef} className="factory-order-container">
          <FactoryOrder stacks={stacks} panels={panels} />
        </div>
      )}
    </div>
  );
}
