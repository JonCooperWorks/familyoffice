import { useState, useEffect } from 'react';
import type { Report, ResearchRequest } from '../../shared/types';
import MarkdownViewer from './MarkdownViewer';
import './Reports.css';

interface BackgroundTask {
  id: string;
  type: 'research' | 'reevaluate';
  ticker: string;
  companyName?: string;
  reportPath?: string;
  output: string[];
  status: 'running' | 'completed' | 'error';
  startTime: Date;
}

interface ReportsProps {
  onChat: (reportPath: string) => void;
}

function Reports({ onChat }: ReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showNewResearch, setShowNewResearch] = useState(false);
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (report: Report) => {
    setSelectedReport(report.path);
  };

  const handleStartResearch = async (mode: 'new' | 'reevaluate', reportPath?: string) => {
    if (!ticker) {
      alert('Please enter a ticker symbol');
      return;
    }

    // Create background task
    const taskId = `${ticker}-${Date.now()}`;
    const newTask: BackgroundTask = {
      id: taskId,
      type: mode === 'reevaluate' ? 'reevaluate' : 'research',
      ticker: ticker.toUpperCase(),
      companyName: companyName || undefined,
      reportPath,
      output: [],
      status: 'running',
      startTime: new Date()
    };

    setBackgroundTasks(prev => [...prev, newTask]);
    
    // Close research modal and return to main view
    setShowNewResearch(false);
    setTicker('');
    setCompanyName('');

    // Set up event handlers for this specific task
    const cleanupOutput = window.electronAPI.onDockerOutput((data) => {
      setBackgroundTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, output: [...task.output, data.data] }
          : task
      ));
    });

    const cleanupComplete = window.electronAPI.onProcessComplete((result) => {
      setBackgroundTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'completed' as const }
          : task
      ));
      loadReports(); // Refresh the reports list
      
      // Auto-remove completed task after 5 seconds
      setTimeout(() => {
        setBackgroundTasks(prev => prev.filter(task => task.id !== taskId));
      }, 5000);
    });

    const cleanupError = window.electronAPI.onProcessError((error) => {
      setBackgroundTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, output: [...task.output, `\n❌ Error: ${error}\n`], status: 'error' as const }
          : task
      ));
    });

    try {
      const request: ResearchRequest = {
        ticker: newTask.ticker,
        companyName: newTask.companyName,
        reportPath: mode === 'reevaluate' ? reportPath : undefined
      };

      await window.electronAPI.runResearch(request);
    } catch (error) {
      console.error('Research error:', error);
      setBackgroundTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'error' as const, output: [...task.output, `\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`] }
          : task
      ));
    } finally {
      cleanupOutput();
      cleanupComplete();
      cleanupError();
    }
  };

  const handleReevaluate = (report: Report) => {
    const match = report.path.match(/research-([A-Z]+)-/);
    if (match) {
      setTicker(match[1]);
    }
    setReevaluateReport(report.path);
    setShowNewResearch(true);
  };

  const handleResearchFromSearch = () => {
    setTicker(searchTerm.toUpperCase());
    setShowNewResearch(true);
  };

  const filteredReports = reports.filter(report =>
    report.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchTickerExists = filteredReports.some(
    report => report.ticker.toLowerCase() === searchTerm.toLowerCase()
  );

  const showResearchButton = searchTerm.length > 0 && !searchTickerExists;

  if (loading) {
    return (
      <div className="reports loading">
        <div className="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  if (selectedReport) {
    return (
      <MarkdownViewer
        reportPath={selectedReport}
        onBack={() => setSelectedReport(null)}
        onChat={(reportPath) => {
          setSelectedReport(null);
          onChat(reportPath);
        }}
        onReevaluate={(reportPath) => {
          setSelectedReport(null);
          handleReevaluate({ path: reportPath } as Report);
        }}
      />
    );
  }

  if (showNewResearch) {
    return (
      <div className="reports">
        <div className="research-modal">
          <div className="research-header">
            <h2>{reevaluateReport ? 'Reevaluate Report' : 'New Research'}</h2>
            <button 
              className="close-modal-button" 
              onClick={() => {
                setShowNewResearch(false);
                setReevaluateReport(null);
                setTicker('');
                setCompanyName('');
                setOutput([]);
              }}
              disabled={isRunning}
            >
              ✕
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleStartResearch(reevaluateReport ? 'reevaluate' : 'new', reevaluateReport || undefined);
          }} className="research-form">
            <div className="form-group">
              <label htmlFor="ticker">Ticker Symbol *</label>
              <input
                id="ticker"
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                maxLength={5}
                disabled={isRunning || !!reevaluateReport}
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

            {reevaluateReport && (
              <div className="form-group">
                <label>Report to Reevaluate</label>
                <input
                  type="text"
                  value={reevaluateReport}
                  disabled
                  className="readonly-input"
                />
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
            >
              {reevaluateReport ? 'Reevaluate Report' : 'Generate Report'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleViewProgress = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowProgressModal(true);
  };

  const handleDismissTask = (taskId: string) => {
    setBackgroundTasks(prev => prev.filter(task => task.id !== taskId));
  };

  return (
    <div className="reports">
      <div className="reports-header">
        <div>
          <h2>Research Reports</h2>
          <p className="description">Search for existing reports or research a new stock</p>
        </div>
      </div>

      {/* Background Tasks Indicator */}
      {backgroundTasks.length > 0 && (
        <div className="background-tasks">
          <h3>Background Tasks</h3>
          {backgroundTasks.map(task => (
            <div key={task.id} className={`task-indicator ${task.status}`}>
              <div className="task-info">
                <span className="task-ticker">{task.ticker}</span>
                <span className="task-type">
                  {task.type === 'reevaluate' ? 'Reevaluating' : 'Researching'}
                </span>
                <span className="task-status">
                  {task.status === 'running' ? (
                    <><span className="spinner">⟳</span> Running</>
                  ) : task.status === 'completed' ? (
                    '✅ Completed'
                  ) : (
                    '❌ Error'
                  )}
                </span>
              </div>
              <div className="task-actions">
                <button 
                  onClick={() => handleViewProgress(task.id)}
                  className="view-progress-btn"
                >
                  View Progress
                </button>
                {task.status !== 'running' && (
                  <button 
                    onClick={() => handleDismissTask(task.id)}
                    className="dismiss-btn"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by ticker or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          className="search-input"
        />
        {showResearchButton && (
          <button 
            onClick={handleResearchFromSearch} 
            className="research-ticker-button"
          >
            Research {searchTerm.toUpperCase()}
          </button>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No reports found</h3>
          <p>
            {searchTerm 
              ? `No reports found for "${searchTerm}"` 
              : 'Search for a ticker to get started'}
          </p>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <div key={report.path} className="report-card">
              <div className="report-header">
                <div>
                  <h3 className="report-ticker">{report.ticker}</h3>
                  {report.company && (
                    <p className="report-company">{report.company}</p>
                  )}
                </div>
                <span className={`report-type ${report.type}`}>
                  {report.type === 'reevaluation' ? 'Reevaluation' : 'Research'}
                </span>
              </div>

              <div className="report-meta">
                <span className="report-date">
                  {new Date(report.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="report-actions">
                <button
                  onClick={() => handleOpen(report)}
                  className="action-button primary"
                  title="Open report"
                >
                  Open
                </button>
                <button
                  onClick={() => onChat(report.path)}
                  className="action-button"
                  title="Chat with this report"
                >
                  Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && selectedTaskId && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="progress-modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const task = backgroundTasks.find(t => t.id === selectedTaskId);
              if (!task) return null;
              
              return (
                <>
                  <div className="progress-header">
                    <h2>{task.ticker} - {task.type === 'reevaluate' ? 'Reevaluation' : 'Research'}</h2>
                    <button 
                      onClick={() => setShowProgressModal(false)}
                      className="close-modal-button"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="progress-info">
                    <div className="progress-status">
                      <span className={`status-indicator ${task.status}`}>
                        {task.status === 'running' ? (
                          <><span className="spinner">⟳</span> Running</>
                        ) : task.status === 'completed' ? (
                          '✅ Completed'
                        ) : (
                          '❌ Error'
                        )}
                      </span>
                      <span className="start-time">
                        Started: {task.startTime.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {task.companyName && (
                      <p className="company-name">Company: {task.companyName}</p>
                    )}
                    
                    {task.reportPath && (
                      <p className="report-path">Report: {task.reportPath}</p>
                    )}
                  </div>

                  <div className="progress-output">
                    <h3>Output</h3>
                    <pre className="output">{task.output.join('')}</pre>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;

