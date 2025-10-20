import { useEffect } from 'react';
import type { DependencyStatus } from '../../shared/types';
import './DepsCheck.css';

interface DepsCheckProps {
  status: DependencyStatus;
  onComplete: () => void;
}

function DepsCheck({ status, onComplete }: DepsCheckProps) {
  // Auto-continue when all dependencies are satisfied
  useEffect(() => {
    const allSatisfied = status.codex.installed && 
                         status.codex.authenticated;
    
    if (allSatisfied) {
      // Small delay to show success state before continuing
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, onComplete]);

  return (
    <div className="deps-check">
      <div className="deps-panel">
        <h1>Setup Required</h1>
        <p className="subtitle">Let's make sure everything is ready to run.</p>

        <div className="deps-list">
          {/* Codex */}
          <div className={`dep-item ${status.codex.installed && status.codex.authenticated ? 'success' : 'error'}`}>
            <div className="dep-info">
              <div className="dep-icon">
                {status.codex.installed && status.codex.authenticated ? '✅' : '❌'}
              </div>
              <div>
                <h3>Codex CLI</h3>
                {status.codex.installed && status.codex.authenticated ? (
                  <p className="success-msg">Authenticated • {status.codex.version}</p>
                ) : status.codex.installed ? (
                  <p className="error-msg">Not authenticated</p>
                ) : (
                  <p className="error-msg">Not installed</p>
                )}
              </div>
            </div>
            {(!status.codex.installed || !status.codex.authenticated) && (
              <div className="dep-action">
                <div className="instructions">
                  <code>brew install codex</code>
                  <br />
                  <code>codex</code> (then sign in)
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="deps-footer">
          <button onClick={onComplete} className="check-again-button">
            Check Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default DepsCheck;

