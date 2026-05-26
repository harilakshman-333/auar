import { useState } from 'react';
import PMDashboard from './components/ProductionManager/PMDashboard';
import FramerDashboard from './components/Framer/FramerDashboard';
import { resetProjectState } from './api/client';
import './index.css';

type ViewMode = 'pm' | 'framer';

export default function App() {
  const [view, setView] = useState<ViewMode>('pm');

  const handleReset = async () => {
    if (
      window.confirm(
        'Are you sure you want to restart fresh? This will reset all panel installations, damages, and delivery plans.'
      )
    ) {
      try {
        await resetProjectState();
        window.location.reload();
      } catch (err: any) {
        alert('Failed to reset system: ' + err.message);
      }
    }
  };

  return (
    <div className={`app app--${view}`}>
      <nav className="view-toggle" id="view-toggle">
        <div className="view-toggle__brand">
          <span className="view-toggle__logo">◆</span>
          <span className="view-toggle__name">AUAR</span>
        </div>
        <div className="view-toggle__buttons">
          <button
            className="view-toggle__btn"
            onClick={handleReset}
            id="system-reset-btn"
            style={{
              marginRight: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            🔄 Restart Fresh
          </button>
          <button
            className={`view-toggle__btn ${
              view === 'pm' ? 'view-toggle__btn--active' : ''
            }`}
            onClick={() => setView('pm')}
            id="toggle-pm-view"
          >
            Production Manager
          </button>
          <button
            className={`view-toggle__btn ${
              view === 'framer' ? 'view-toggle__btn--active' : ''
            }`}
            onClick={() => setView('framer')}
            id="toggle-framer-view"
          >
            Framer
          </button>
        </div>
      </nav>
      <main className="app__content">
        {view === 'pm' ? <PMDashboard /> : <FramerDashboard />}
      </main>
    </div>
  );
}
