// ──────────────────────────────────────────────
// Framer — Assembly Focus Mode (Stage 2)
// Single-panel view with massive tap targets
// Bottom navigation to go back and update statuses
// ──────────────────────────────────────────────

import { useState } from 'react';
import type { Panel } from '../../types';

interface AssemblyViewProps {
  currentPanel: Panel;
  totalRemaining: number;
  totalPanels: number;
  onMarkInstalled: (id: string) => Promise<void>;
  onReportDamaged: (id: string) => Promise<void>;
  onResetStatus: (id: string) => Promise<void>;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function AssemblyView({
  currentPanel,
  totalRemaining,
  totalPanels,
  onMarkInstalled,
  onReportDamaged,
  onResetStatus,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: AssemblyViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = ((totalPanels - totalRemaining) / totalPanels) * 100;

  const handleInstall = async () => {
    setLoading(true);
    setError(null);
    try {
      await onMarkInstalled(currentPanel.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDamage = async () => {
    setLoading(true);
    setError(null);
    try {
      await onReportDamaged(currentPanel.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await onResetStatus(currentPanel.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine card header style/label based on status
  let statusLabel = "INSTALL NOW";
  let statusClass = "assembly__card-label--pending";
  if (currentPanel.status === 'installed') {
    statusLabel = "✓ INSTALLED";
    statusClass = "assembly__card-label--installed";
  } else if (currentPanel.status === 'damaged') {
    statusLabel = "✕ DAMAGED";
    statusClass = "assembly__card-label--damaged";
  }

  return (
    <div className="assembly" id="framer-assembly">
      {/* Progress bar */}
      <div className="assembly__progress">
        <div
          className="assembly__progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="assembly__progress-text">
        {totalPanels - totalRemaining} of {totalPanels} installed
      </p>

      {/* Current panel card */}
      <div className="assembly__card">
        <div className={`assembly__card-label ${statusClass}`}>{statusLabel}</div>
        <h1 className="assembly__panel-id">{currentPanel.id}</h1>

        <div className="assembly__details">
          <div className="assembly__detail">
            <span className="assembly__detail-label">TYPE</span>
            <span className="assembly__detail-value">
              {currentPanel.type.replace('_', ' ')}
            </span>
          </div>
          <div className="assembly__detail">
            <span className="assembly__detail-label">ZONE</span>
            <span className="assembly__detail-value">
              {currentPanel.zone.toUpperCase()}
            </span>
          </div>
          <div className="assembly__detail">
            <span className="assembly__detail-label">LEVEL</span>
            <span className="assembly__detail-value">L{currentPanel.level}</span>
          </div>
          <div className="assembly__detail">
            <span className="assembly__detail-label">WEIGHT</span>
            <span className="assembly__detail-value">
              {currentPanel.weight_kg}kg
            </span>
          </div>
          <div className="assembly__detail">
            <span className="assembly__detail-label">SIZE</span>
            <span className="assembly__detail-value">
              {currentPanel.width_mm}×{currentPanel.height_mm}mm
            </span>
          </div>
          <div className="assembly__detail">
            <span className="assembly__detail-label">SEQUENCE</span>
            <span className="assembly__detail-value">
              #{currentPanel.install_sequence}
            </span>
          </div>
        </div>

        {currentPanel.notes && (
          <div className="assembly__notes">
            <strong>⚠ NOTE:</strong> {currentPanel.notes}
          </div>
        )}
      </div>

      {error && <div className="assembly__error">{error}</div>}

      {/* Giant action buttons */}
      <div className="assembly__actions">
        {currentPanel.status !== 'installed' && (
          <button
            className="assembly__btn assembly__btn--install"
            onClick={handleInstall}
            disabled={loading}
            id="mark-installed-btn"
          >
            {loading ? 'UPDATING…' : '✓ MARK INSTALLED'}
          </button>
        )}

        {currentPanel.status !== 'damaged' && (
          <button
            className="assembly__btn assembly__btn--damage"
            onClick={handleDamage}
            disabled={loading}
            id="report-damaged-btn"
          >
            {loading ? 'UPDATING…' : '✕ REPORT DAMAGED'}
          </button>
        )}

        {(currentPanel.status === 'installed' || currentPanel.status === 'damaged') && (
          <button
            className="assembly__btn assembly__btn--reset"
            onClick={handleReset}
            disabled={loading}
            id="reset-status-btn"
          >
            {loading ? 'UPDATING…' : '↺ RESET TO STACKED'}
          </button>
        )}
      </div>

      {/* Navigation options at the bottom */}
      <div className="assembly__navigation">
        <button
          className="assembly__nav-btn"
          onClick={onPrev}
          disabled={!hasPrev}
          id="prev-panel-btn"
        >
          ← PREV PANEL
        </button>
        <button
          className="assembly__nav-btn"
          onClick={onNext}
          disabled={!hasNext}
          id="next-panel-btn"
        >
          NEXT PANEL →
        </button>
      </div>
    </div>
  );
}
