import { useState, useEffect } from 'react';
import type { ResearchRequest } from '../../shared/types';
import './Research.css';

interface ResearchProps {
  preloadedReport?: string;
  onClearReport: () => void;
}

function Research({ preloadedReport, onClearReport }: ResearchProps) {
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mode, setMode] = useState<'new' | 'reevaluate'>('new');
  const [reportPath, setReportPath] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [resultPath, setResultPath] = useState<string | null>(null);

  useEffect(() => {
    if (preloadedReport) {
      setReportPath(preloadedReport);
      setMode('reevaluate');
      
      // Extract ticker from filename
      const match = preloadedReport.match(/research-([A-Z]+)-/);
      if (match) {
        setTicker(match[1]);
      }
    }
  }, [preloadedReport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticker) {
      alert('Please enter a ticker symbol');
      return;
    }

    if (mode === 'reevaluate' && !reportPath) {
      alert('Please enter a report path');
      return;
    }

    setIsRunning(true);
    setOutput([]);
    setResultPath(null);

    const cleanupOutput = window.electronAPI.onDockerOutput((data) => {
      setOutput(prev => [...prev, data.data]);
    });

    const cleanupComplete = window.electronAPI.onProcessComplete((result) => {
      setResultPath(result);
      setIsRunning(false);
    });

    const cleanupError = window.electronAPI.onProcessError((error) => {
      setOutput(prev => [...prev, `\n❌ Error: ${error}\n`]);
      setIsRunning(false);
    });

    try {
      const request: ResearchRequest = {
        ticker: ticker.toUpperCase(),
        companyName: companyName || undefined,
        reportPath: mode === 'reevaluate' ? reportPath : undefined
      };

      await window.electronAPI.runResearch(request);
    } catch (error) {
      console.error('Research error:', error);
    } finally {
      cleanupOutput();
      cleanupComplete();
      cleanupError();
    }
  };

  const handleOpenReport = async () => {
    if (resultPath) {
      await window.electronAPI.openReport(resultPath);
    }
  };

  const handleReset = () => {
    setTicker('');
    setCompanyName('');
    setMode('new');
    setReportPath('');
    setOutput([]);
    setResultPath(null);
    setIsRunning(false);
    onClearReport();
  };

  return (
    <div className="research">
      <div className="research-container">
        <h2>Stock Research</h2>
        <p className="description">
          Generate comprehensive equity research reports with AI-powered analysis
        </p>

        <form onSubmit={handleSubmit} className="research-form">
          <div className="form-group">
            <label htmlFor="ticker">Ticker Symbol *</label>
            <input
              id="ticker"
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              maxLength={5}
              disabled={isRunning}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="company">Company Name (optional)</label>
            <input
              id="company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Apple Inc."
              disabled={isRunning}
            />
          </div>

          <div className="form-group">
            <label>Mode</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="new"
                  checked={mode === 'new'}
                  onChange={() => setMode('new')}
                  disabled={isRunning}
                />
                New Research
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="reevaluate"
                  checked={mode === 'reevaluate'}
                  onChange={() => setMode('reevaluate')}
                  disabled={isRunning}
                />
                Reevaluate Existing Report
              </label>
            </div>
          </div>

          {mode === 'reevaluate' && (
            <div className="form-group">
              <label htmlFor="report">Report Path *</label>
              <input
                id="report"
                type="text"
                value={reportPath}
                onChange={(e) => setReportPath(e.target.value)}
                placeholder="./reports/research-AAPL-2025-10-11T14-30-00.md"
                disabled={isRunning}
                required
              />
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="submit-button"
              disabled={isRunning}
            >
              {isRunning ? 'Generating...' : 'Generate Report'}
            </button>
            {(output.length > 0 || resultPath) && (
              <button
                type="button"
                onClick={handleReset}
                className="reset-button"
                disabled={isRunning}
              >
                Reset
              </button>
            )}
          </div>
        </form>

        {output.length > 0 && (
          <div className="output-container">
            <h3>Output</h3>
            <pre className="output">{output.join('')}</pre>
          </div>
        )}

        {resultPath && (
          <div className="result">
            <div className="result-icon">✅</div>
            <div>
              <h3>Report Generated Successfully!</h3>
              <p className="result-path">{resultPath}</p>
              <button onClick={handleOpenReport} className="open-button">
                Open Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Research;

