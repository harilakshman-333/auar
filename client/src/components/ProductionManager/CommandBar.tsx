// ──────────────────────────────────────────────
// Production Manager — Command Bar Component
// Natural language input for the AI constraint solver
// ──────────────────────────────────────────────

import { useState } from 'react';
import { generateAIPlan } from '../../api/client';
import type { Stack } from '../../types';

interface CommandBarProps {
  onPlanGenerated: (stacks: Stack[], reasoning: string) => void;
}

export default function CommandBar({ onPlanGenerated }: CommandBarProps) {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generateAIPlan(command.trim());
      onPlanGenerated(result.stacks, result.reasoning);
      setCommand('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Plan Day 1 deliveries assuming a 500kg limit',
    'The truck broke down, limit Day 1 to 200kg total',
    'EW-L1-N1 is damaged, re-plan the remaining sequence',
    'Plan all deliveries for the full project',
  ];

  return (
    <div className="command-bar">
      <div className="command-bar__header">
        <div className="command-bar__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
            <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
            <path d="M8.56 13.68C5.46 14.93 3.5 17.02 3.5 19.5h17c0-2.48-1.96-4.57-5.06-5.82" />
          </svg>
        </div>
        <h3>AI Command Bar</h3>
        <span className="command-bar__badge">GPT-4o</span>
      </div>

      <form onSubmit={handleSubmit} className="command-bar__form">
        <div className="command-bar__input-wrap">
          <input
            type="text"
            id="ai-command-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g. Plan Day 1 deliveries with 500kg limit..."
            disabled={loading}
            className="command-bar__input"
          />
          <button
            type="submit"
            disabled={loading || !command.trim()}
            className="command-bar__submit"
            id="ai-submit-btn"
          >
            {loading ? (
              <span className="command-bar__spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="command-bar__error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      <div className="command-bar__suggestions">
        <span className="command-bar__suggestions-label">Try:</span>
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="command-bar__suggestion"
            onClick={() => setCommand(s)}
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
